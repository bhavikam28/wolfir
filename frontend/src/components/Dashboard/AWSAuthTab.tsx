/**
 * AWS Authentication Tab Component
 * Secure method for judges to connect their AWS accounts
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Cloud, Key, Shield, CheckCircle2, AlertCircle, 
  Info, ExternalLink, Copy, Loader2 
} from 'lucide-react';

interface AWSAuthTabProps {
  onAuthMethodSelected: (method: 'profile' | 'sso' | 'credentials') => void;
  currentMethod?: string;
  onTestConnection: () => Promise<boolean>;
  loading?: boolean;
}

const AWSAuthTab: React.FC<AWSAuthTabProps> = ({ 
  onAuthMethodSelected, 
  currentMethod,
  onTestConnection,
  loading = false 
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'profile' | 'sso' | 'credentials'>(currentMethod as any || 'profile');
  const [profileName, setProfileName] = useState('secops-lens');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);

  const handleMethodChange = (method: 'profile' | 'sso' | 'credentials') => {
    setSelectedMethod(method);
    onAuthMethodSelected(method);
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const success = await onTestConnection();
      setTestResult({
        success,
        message: success 
          ? 'Successfully connected to AWS account!' 
          : 'Failed to connect. Please check your credentials.'
      });
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'Connection test failed'
      });
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-2xl font-bold text-slate-900 mb-2">
          Secure AWS Authentication
        </h3>
        <p className="text-slate-600">
          Choose a secure method to connect your AWS account. Your credentials are never stored on our servers.
        </p>
      </div>

      {/* Authentication Methods */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Method 1: AWS CLI Profile (Recommended) */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          onClick={() => handleMethodChange('profile')}
          className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
            selectedMethod === 'profile'
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-slate-200 bg-white hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              selectedMethod === 'profile' ? 'bg-indigo-500' : 'bg-slate-100'
            }`}>
              <Key className={`w-6 h-6 ${selectedMethod === 'profile' ? 'text-white' : 'text-slate-600'}`} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900">AWS CLI Profile</h4>
              <p className="text-xs text-slate-500">Recommended</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Use your existing AWS CLI profile. Credentials stored locally on your machine.
          </p>
          {selectedMethod === 'profile' && (
            <div className="space-y-3 mt-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Profile Name
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="default"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Profile name from <code className="bg-slate-100 px-1 rounded">~/.aws/credentials</code>
                </p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Method 2: AWS SSO */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          onClick={() => handleMethodChange('sso')}
          className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
            selectedMethod === 'sso'
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-slate-200 bg-white hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              selectedMethod === 'sso' ? 'bg-indigo-500' : 'bg-slate-100'
            }`}>
              <Shield className={`w-6 h-6 ${selectedMethod === 'sso' ? 'text-white' : 'text-slate-600'}`} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900">AWS SSO</h4>
              <p className="text-xs text-slate-500">Enterprise</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Single Sign-On via AWS IAM Identity Center. Browser-based login.
          </p>
          {selectedMethod === 'sso' && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700">
                <strong>Coming Soon:</strong> AWS SSO login will open in a new browser window for secure authentication.
              </p>
            </div>
          )}
        </motion.div>

        {/* Method 3: Temporary Credentials */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          onClick={() => handleMethodChange('credentials')}
          className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
            selectedMethod === 'credentials'
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-slate-200 bg-white hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              selectedMethod === 'credentials' ? 'bg-indigo-500' : 'bg-slate-100'
            }`}>
              <Cloud className={`w-6 h-6 ${selectedMethod === 'credentials' ? 'text-white' : 'text-slate-600'}`} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900">Temporary Credentials</h4>
              <p className="text-xs text-slate-500">Advanced</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Enter temporary AWS credentials (Access Key, Secret Key, Session Token).
          </p>
          {selectedMethod === 'credentials' && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700">
                <strong>Note:</strong> Credentials are used in-memory only and never stored.
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Setup Instructions */}
      {selectedMethod === 'profile' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-slate-50 border border-slate-200 rounded-xl p-6"
        >
          <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-indigo-600" />
            Setup Instructions
          </h4>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">1. Configure AWS CLI Profile</p>
              <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                <div className="flex items-center justify-between mb-2">
                  <span># Run this command in your terminal:</span>
                  <button
                    onClick={() => copyToClipboard('aws configure --profile secops-lens')}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <div>aws configure --profile {profileName}</div>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">2. Required Permissions</p>
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• <code className="bg-slate-100 px-1 rounded">cloudtrail:LookupEvents</code> - Read CloudTrail events</li>
                  <li>• <code className="bg-slate-100 px-1 rounded">bedrock:InvokeModel</code> - Use Nova AI models</li>
                  <li>• <code className="bg-slate-100 px-1 rounded">dynamodb:PutItem</code> - Store analysis results (optional)</li>
                </ul>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">3. Verify Connection</p>
              <button
                onClick={handleTestConnection}
                disabled={testing || loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {testing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Test AWS Connection
                  </>
                )}
              </button>
              {testResult && (
                <div className={`mt-3 p-3 rounded-lg flex items-center gap-2 ${
                  testResult.success 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  {testResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${
                    testResult.success ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {testResult.message}
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Security Notice */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-indigo-900 mb-1">Security & Privacy</p>
            <ul className="text-xs text-indigo-700 space-y-1">
              <li>• Your AWS credentials are never transmitted to our servers</li>
              <li>• All AWS API calls are made directly from your browser/backend using your local credentials</li>
              <li>• Analysis results are stored in your AWS account (DynamoDB) or temporarily in memory</li>
              <li>• You can revoke access at any time by removing the AWS profile</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AWSAuthTab;
