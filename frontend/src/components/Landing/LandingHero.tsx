/**
 * Professional Hero Section - Clean, no weird backgrounds
 */
import React from 'react';
import { ArrowRight, Zap, Clock, CheckCircle } from 'lucide-react';
import NovaSentinelLogo from '../Logo';
import AttackPathVisualization from '../Visualizations/AttackPathVisualization';

const LandingHero: React.FC = () => {
  const stats = [
    { value: '99.5%', label: 'Faster Incident Response', icon: Zap },
    { value: '<1 min', label: 'Average Resolution Time', icon: Clock },
    { value: '100%', label: 'Automation Coverage', icon: CheckCircle },
  ];

  return (
    <div className="relative bg-white overflow-hidden">
      {/* Hero Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-primary-50 border border-primary-200 mb-8 animate-fadeInUp">
            <span className="text-primary-700 text-sm font-medium">
              Powered by Amazon Nova AI
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 tracking-tight leading-tight animate-fadeInUp">
            Protect Everything
            <br />
            <span className="text-primary-600">You Build and Run</span>
            <br />
            in the Cloud
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed animate-fadeInUp">
            Resolve security incidents in under 1 minute with autonomous multi-agent AI. 
            Nova Sentinel combines visual analysis, temporal reasoning, and intelligent 
            automation for complete cloud security incident response.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 animate-fadeInUp">
            <a
              href="#demo"
              className="btn-professional group px-8 py-4 bg-primary-600 text-white rounded-lg font-semibold text-base shadow-professional hover:bg-primary-700 flex items-center"
            >
              Try Live Demo
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="#features"
              className="btn-professional px-8 py-4 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold text-base hover:border-primary-600 hover:text-primary-600 flex items-center"
            >
              View Features
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto pt-12 border-t border-gray-200">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center animate-fadeInUp" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-50 text-primary-600 mb-3">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Visual Attack Path Section - Clean and Professional */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <AttackPathVisualization />
      </div>

      {/* Trusted by section */}
      <div className="relative z-10 bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <p className="text-center text-sm text-gray-500 mb-8">
            Built with Amazon Nova for enterprise security teams
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8">
            {['Amazon Bedrock', 'Nova Pro', 'Nova 2 Lite', 'Nova Micro', 'Nova 2 Sonic', 'Nova Act'].map((tech, index) => (
              <div 
                key={index} 
                className="px-6 py-3 bg-white rounded-lg border border-gray-200 shadow-professional hover:border-primary-300 transition-all"
              >
                <span className="text-sm font-semibold text-gray-700">{tech}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingHero;
