/**
 * AWS Authentication Tab - Premium card-based auth selector
 * Secure connection to link AWS accounts
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Key, Shield, CheckCircle2, AlertCircle, 
  Copy, Loader2, Terminal, Lock
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

  const methods = [
    {
      id: 'profile' as const,
      icon: Terminal,
      title: 'AWS CLI Profile',
      subtitle: 'Recommended',
      description: 'Use aws login (CLI 2.32+) — browser OAuth, no keys on disk, auto-refresh.',
    },
    {
      id: 'sso' as const,
      icon: Lock,
      title: 'AWS SSO',
      subtitle: 'Enterprise',
      description: 'Single Sign-On via AWS IAM Identity Center.',
    },
    {
      id: 'credentials' as const,
      icon: Key,
      title: 'Temporary Credentials',
      subtitle: 'Advanced',
      description: 'Enter temporary AWS Access Key + Session Token.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold text-slate-900 mb-1">
          Connect Your AWS Account
        </h3>
        <p className="text-sm text-slate-500">
          Choose a secure method. Credentials are <span className="font-semibold text-slate-700">never stored</span> on our servers.
        </p>
      </div>

      {/* Auth Methods */}
      <div className="grid md:grid-cols-3 gap-3">
        {methods.map((method) => {
          const Icon = method.icon;
          const isSelected = selectedMethod === method.id;
          return (
            <motion.button
              key={method.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleMethodChange(method.id)}
              className={`text-left p-5 rounded-xl border-2 transition-all duration-200 ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50/50 shadow-glow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                  isSelected ? 'bg-indigo-600' : 'bg-slate-100'
                }`}>
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{method.title}</h4>
                  <p className="text-[10px] text-slate-500 font-medium">{method.subtitle}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500">{method.description}</p>
            </motion.button>
          );
        })}
      </div>

      {/* Profile Configuration */}
      {selectedMethod === 'profile' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-5"
        >
          {/* Profile Input */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Profile Name</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="default"
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              />
              <button
                onClick={handleTestConnection}
                disabled={testing || loading}
                className="btn-nova px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
              >
                {testing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Testing...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Test Connection</>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              Uses profile from <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">aws login</code> or config
            </p>
          </div>

          {/* Test Result */}
          {testResult && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-lg flex items-center gap-3 ${
                testResult.success 
                  ? 'bg-emerald-50 border border-emerald-200' 
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              )}
              <span className={`text-sm font-medium ${testResult.success ? 'text-emerald-700' : 'text-red-700'}`}>
                {testResult.message}
              </span>
            </motion.div>
          )}

          {/* Quick Setup */}
          <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-mono">Quick Setup</span>
              <button
                onClick={() => copyToClipboard(profileName === 'default' ? 'aws login' : `aws login --profile ${profileName}`)}
                className="text-xs text-slate-500 hover:text-white transition-colors flex items-center gap-1"
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
            </div>
            <code className="text-sm text-green-400 font-mono">
              {profileName === 'default' ? 'aws login' : `aws login --profile ${profileName}`}
            </code>
          </div>
        </motion.div>
      )}

      {/* SSO Coming Soon */}
      {selectedMethod === 'sso' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <p className="text-sm text-blue-700 font-medium">
            <strong>Coming Soon:</strong> AWS SSO integration will open a browser window for secure authentication via IAM Identity Center.
          </p>
        </motion.div>
      )}

      {/* Temp Credentials Note */}
      {selectedMethod === 'credentials' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <p className="text-sm text-amber-700 font-medium">
            <strong>Note:</strong> Temporary credentials are used in-memory only and are never persisted or transmitted.
          </p>
        </motion.div>
      )}

      {/* Security Notice */}
      <div className="flex items-start gap-3 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
        <Shield className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-indigo-600 leading-relaxed">
          <strong>Security:</strong> All AWS API calls use your local credentials. Nothing is stored server-side. 
          Revoke access anytime by removing the AWS profile.
        </p>
      </div>
    </div>
  );
};

export default AWSAuthTab;
