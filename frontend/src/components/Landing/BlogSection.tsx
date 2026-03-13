/**
 * Blog Section — wolfir blog list (posts open in separate page)
 */
import React from 'react';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import { BLOGS } from '../../data/blogsData';

interface BlogSectionProps {
  onPostClick?: (postId: string) => void;
}

const BlogSection: React.FC<BlogSectionProps> = ({ onPostClick }) => {
  const handlePostClick = (postId: string) => {
    if (onPostClick) {
      onPostClick(postId);
    } else {
      window.location.hash = `#blog/${postId}`;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  };

  return (
    <section className="py-20 bg-white border-t border-slate-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="text-[11px] font-semibold text-indigo-600 uppercase tracking-[0.2em] mb-3">
            Blog
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 tracking-tight">
            Insights & Challenges
          </h2>
          <p className="text-slate-600 max-w-xl mx-auto">
            Deep dives on wolfir's design, multi-agent orchestration, AI pipeline security, and more.
          </p>
        </motion.div>

        <div className="space-y-4">
          {BLOGS.map((blog) => (
            <motion.button
              key={blog.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              onClick={() => handlePostClick(blog.id)}
              className="w-full text-left bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-200 transition-all p-6 flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-slate-900 text-base">{blog.title}</h3>
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{blog.excerpt}</p>
                <span className="text-xs text-indigo-600 font-semibold mt-2 inline-block">Read more →</span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BlogSection;
