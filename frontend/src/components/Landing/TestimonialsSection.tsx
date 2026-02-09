/**
 * Customer Testimonials Section - Wiz-inspired
 */
import React from 'react';
import { Star, Quote } from 'lucide-react';

interface Testimonial {
  quote: string;
  author: string;
  title: string;
  company: string;
  rating: number;
}

const testimonials: Testimonial[] = [
  {
    quote: "Nova Sentinel has transformed how our security team responds to incidents. What used to take hours now takes less than a minute.",
    author: "Sarah Chen",
    title: "CISO",
    company: "Enterprise Tech Corp",
    rating: 5,
  },
  {
    quote: "The temporal analysis feature is incredible. It traces attack patterns through our CloudTrail logs faster and more accurately than any human could.",
    author: "Michael Rodriguez",
    title: "Director of Security Operations",
    company: "Financial Services Inc",
    rating: 5,
  },
  {
    quote: "Finally, a tool that actually provides actionable insights instead of just noise. The AI-powered remediation plans are always spot-on.",
    author: "Emily Thompson",
    title: "VP of Cloud Security",
    company: "Healthcare Platform",
    rating: 5,
  },
];

const TestimonialsSection: React.FC = () => {
  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Trusted by Security Teams
          </h2>
          <p className="text-xl text-gray-600">
            See what security professionals are saying about Nova Sentinel
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-8 shadow-professional border border-gray-200 hover:shadow-professional-lg transition-all"
            >
              {/* Rating */}
              <div className="flex mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>

              {/* Quote */}
              <Quote className="h-8 w-8 text-primary-200 mb-4" />
              <p className="text-gray-700 mb-6 leading-relaxed">
                "{testimonial.quote}"
              </p>

              {/* Author */}
              <div className="border-t border-gray-200 pt-4">
                <div className="font-semibold text-gray-900">{testimonial.author}</div>
                <div className="text-sm text-gray-600">{testimonial.title}</div>
                <div className="text-sm text-gray-500">{testimonial.company}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
