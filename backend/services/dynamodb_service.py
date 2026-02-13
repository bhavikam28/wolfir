"""
DynamoDB Service - Store incident history and analysis results
"""
import json
import asyncio
import boto3
from typing import Dict, Any, List, Optional
from datetime import datetime
from botocore.exceptions import ClientError

from utils.config import get_settings
from utils.logger import logger


class DynamoDBService:
    """Service for DynamoDB operations"""
    
    def __init__(self):
        self.settings = get_settings()
        
        # Create session with profile if specified
        if self.settings.aws_profile and self.settings.aws_profile != "default":
            session = boto3.Session(profile_name=self.settings.aws_profile)
            logger.info(f"Using AWS profile: {self.settings.aws_profile}")
        else:
            session = boto3.Session()
            logger.info("Using default AWS credentials")
        
        self.client = session.client(
            'dynamodb',
            region_name=self.settings.aws_region
        )
        self.table_name = self.settings.dynamodb_table
        self._table_checked = False
        logger.info(f"DynamoDB client initialized for region: {self.settings.aws_region}")
    
    async def _ensure_table_exists(self):
        """Ensure the DynamoDB table exists, create if it doesn't"""
        try:
            # Check if table exists
            await asyncio.to_thread(
                self.client.describe_table,
                TableName=self.table_name
            )
            logger.info(f"DynamoDB table {self.table_name} exists")
        except ClientError as e:
            if e.response['Error']['Code'] == 'ResourceNotFoundException':
                logger.info(f"Creating DynamoDB table {self.table_name}")
                try:
                    await asyncio.to_thread(
                        self.client.create_table,
                        TableName=self.table_name,
                        KeySchema=[{'AttributeName': 'incident_id', 'KeyType': 'HASH'}],
                        AttributeDefinitions=[{'AttributeName': 'incident_id', 'AttributeType': 'S'}],
                        BillingMode='PAY_PER_REQUEST'
                    )
                    waiter = self.client.get_waiter('table_exists')
                    await asyncio.to_thread(waiter.wait, TableName=self.table_name)
                    logger.info(f"DynamoDB table {self.table_name} is now ACTIVE")
                except Exception as create_error:
                    logger.warning(f"Could not create table (may already exist): {create_error}")
            else:
                logger.error(f"Error checking table: {e}")
    
    async def save_incident(
        self,
        incident_id: str,
        analysis_result: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Save incident analysis to DynamoDB
        
        Args:
            incident_id: Unique incident identifier
            analysis_result: Full analysis result
            metadata: Optional metadata
            
        Returns:
            True if successful
        """
        # Ensure table exists on first use
        if not self._table_checked:
            await self._ensure_table_exists()
            self._table_checked = True
        
        try:
            timestamp = datetime.utcnow().isoformat()
            
            item = {
                'incident_id': {'S': incident_id},
                'created_at': {'S': timestamp},
                'updated_at': {'S': timestamp},
                'analysis_result': {'S': json.dumps(analysis_result, default=str)},
                'status': {'S': analysis_result.get('status', 'completed')},
                'analysis_time_ms': {'N': str(analysis_result.get('analysis_time_ms', 0))},
            }
            
            # Add metadata if provided
            if metadata:
                item['metadata'] = {'S': json.dumps(metadata, default=str)}
            
            # Add model used
            if 'model_used' in analysis_result:
                item['model_used'] = {'S': analysis_result['model_used']}
            
            # Add timeline summary if available
            if 'timeline' in analysis_result:
                timeline = analysis_result['timeline']
                if isinstance(timeline, dict):
                    item['event_count'] = {'N': str(len(timeline.get('events', [])))}
                    item['confidence'] = {'N': str(timeline.get('confidence', 0))}
            
            await asyncio.to_thread(
                self.client.put_item,
                TableName=self.table_name,
                Item=item
            )
            
            logger.info(f"Saved incident {incident_id} to DynamoDB")
            return True
            
        except Exception as e:
            logger.error(f"Error saving incident to DynamoDB: {e}")
            return False
    
    async def get_incident(
        self,
        incident_id: str,
        created_at: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Get incident from DynamoDB
        
        Args:
            incident_id: Incident ID
            created_at: Optional timestamp (if not provided, gets latest)
            
        Returns:
            Incident data or None
        """
        try:
            key = {
                'incident_id': {'S': incident_id}
            }
            
            # Note: created_at is no longer a key, just an attribute
            # We'll get the latest item by incident_id only
            
            response = await asyncio.to_thread(
                self.client.get_item,
                TableName=self.table_name,
                Key=key
            )
            
            if 'Item' not in response:
                return None
            
            item = response['Item']
            
            # Parse the item
            result = {
                'incident_id': item['incident_id']['S'],
                'created_at': item['created_at']['S'],
                'updated_at': item.get('updated_at', {}).get('S'),
                'status': item.get('status', {}).get('S'),
                'analysis_time_ms': int(item.get('analysis_time_ms', {}).get('N', '0')),
            }
            
            # Parse analysis result
            if 'analysis_result' in item:
                result['analysis_result'] = json.loads(item['analysis_result']['S'])
            
            # Parse metadata
            if 'metadata' in item:
                result['metadata'] = json.loads(item['metadata']['S'])
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting incident from DynamoDB: {e}")
            return None
    
    async def list_incidents(
        self,
        limit: int = 50,
        status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        List incidents from DynamoDB
        
        Args:
            limit: Maximum number of incidents to return
            status: Optional status filter
            
        Returns:
            List of incidents
        """
        try:
            # Note: This is a simplified scan - in production, use GSI for better performance
            scan_kwargs = {
                'TableName': self.table_name,
                'Limit': limit
            }
            
            if status:
                scan_kwargs['FilterExpression'] = 'status = :status'
                scan_kwargs['ExpressionAttributeValues'] = {
                    ':status': {'S': status}
                }
            
            response = await asyncio.to_thread(
                self.client.scan,
                **scan_kwargs
            )
            
            incidents = []
            for item in response.get('Items', []):
                incident = {
                    'incident_id': item['incident_id']['S'],
                    'created_at': item['created_at']['S'],
                    'status': item.get('status', {}).get('S', 'unknown'),
                    'analysis_time_ms': int(item.get('analysis_time_ms', {}).get('N', '0')),
                }
                
                # Add summary fields
                if 'event_count' in item:
                    incident['event_count'] = int(item['event_count']['N'])
                if 'confidence' in item:
                    incident['confidence'] = float(item['confidence']['N'])
                
                incidents.append(incident)
            
            # Sort by created_at descending
            incidents.sort(key=lambda x: x['created_at'], reverse=True)
            
            logger.info(f"Retrieved {len(incidents)} incidents from DynamoDB")
            return incidents
            
        except Exception as e:
            logger.error(f"Error listing incidents from DynamoDB: {e}")
            return []
    
    async def update_incident_state(
        self,
        incident_id: str,
        new_state: Dict[str, Any]
    ) -> bool:
        """
        Update incident state in DynamoDB
        
        Args:
            incident_id: Incident ID
            new_state: New state dictionary to merge/update
            
        Returns:
            True if successful
        """
        try:
            # Get current incident
            current = await self.get_incident(incident_id)
            if not current:
                # If doesn't exist, save as new
                return await self.save_incident(incident_id, new_state)
            
            # Merge with existing state
            current_result = current.get('analysis_result', {})
            if isinstance(current_result, dict):
                # Deep merge
                merged_state = {**current_result, **new_state}
            else:
                merged_state = new_state
            
            # Save updated state
            return await self.save_incident(incident_id, merged_state, current.get('metadata'))
            
        except Exception as e:
            logger.error(f"Error updating incident state: {e}")
            return False
    
    async def update_incident_status(
        self,
        incident_id: str,
        status: str,
        created_at: Optional[str] = None
    ) -> bool:
        """
        Update incident status
        
        Args:
            incident_id: Incident ID
            status: New status
            created_at: Optional timestamp
            
        Returns:
            True if successful
        """
        try:
            key = {
                'incident_id': {'S': incident_id}
            }
            
            # Note: created_at is no longer a key, just an attribute
            
            update_expression = 'SET #status = :status, updated_at = :updated_at'
            expression_attribute_names = {'#status': 'status'}
            expression_attribute_values = {
                ':status': {'S': status},
                ':updated_at': {'S': datetime.utcnow().isoformat()}
            }
            
            await asyncio.to_thread(
                self.client.update_item,
                TableName=self.table_name,
                Key=key,
                UpdateExpression=update_expression,
                ExpressionAttributeNames=expression_attribute_names,
                ExpressionAttributeValues=expression_attribute_values
            )
            
            logger.info(f"Updated incident {incident_id} status to {status}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating incident status: {e}")
            return False
