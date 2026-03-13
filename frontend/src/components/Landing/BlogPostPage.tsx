/**
 * Blog Post Page — full-page article view (separate tab/page)
 * Medium-style: detailed, long-form content
 */
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import type { BlogPost } from '../../data/blogsData';

function renderMarkdown(text: string): React.ReactNode[] {
  const blocks = text.split(/\n\n+/);
  return blocks.map((block, i) => {
    const key = `block-${i}`;
    if (block.startsWith('## ')) {
      return <h2 key={key} className="text-2xl font-bold text-slate-900 mt-12 mb-4 first:mt-0">{block.slice(3)}</h2>;
    }
    if (block.startsWith('### ')) {
      return <h3 key={key} className="text-xl font-bold text-slate-900 mt-10 mb-3">{block.slice(4)}</h3>;
    }
    if (block.startsWith('- ')) {
      const items = block.split('\n').filter(Boolean).map((line) => line.replace(/^- /, ''));
      return (
        <ul key={key} className="list-disc list-outside ml-6 space-y-3 text-slate-600 text-lg leading-relaxed my-6">
          {items.map((item, j) => {
            const parts = item.split(/(\*\*[^*]+\*\*)/g);
            return (
              <li key={j}>
                {parts.map((part, k) =>
                  part.startsWith('**') && part.endsWith('**') ? (
                    <strong key={k} className="font-semibold text-slate-700">{part.slice(2, -2)}</strong>
                  ) : (
                    part
                  )
                )}
              </li>
            );
          })}
        </ul>
      );
    }
    if (block.startsWith('1. ') || block.match(/^\d+\. /)) {
      const items = block.split(/\n(?=\d+\. )/).filter(Boolean);
      return (
        <ol key={key} className="list-decimal list-outside ml-6 space-y-3 text-slate-600 text-lg leading-relaxed my-6">
          {items.map((item, j) => {
            const clean = item.replace(/^\d+\.\s*/, '');
            const parts = clean.split(/(\*\*[^*]+\*\*)/g);
            return (
              <li key={j}>
                {parts.map((part, k) =>
                  part.startsWith('**') && part.endsWith('**') ? (
                    <strong key={k} className="font-semibold text-slate-700">{part.slice(2, -2)}</strong>
                  ) : (
                    part
                  )
                )}
              </li>
            );
          })}
        </ol>
      );
    }
    const parts = block.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={key} className="text-slate-600 text-lg leading-relaxed my-5">
        {parts.map((part, k) =>
          part.startsWith('**') && part.endsWith('**') ? (
            <strong key={k} className="font-semibold text-slate-700">{part.slice(2, -2)}</strong>
          ) : (
            part
          )
        )}
      </p>
    );
  });
}

interface BlogPostPageProps {
  post: BlogPost;
  onBack: () => void;
}

const BlogPostPage: React.FC<BlogPostPageProps> = ({ post, onBack }) => {
  return (
    <div className="min-h-screen bg-white">
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blog
        </button>
        <header className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
            {post.title}
          </h1>
          <p className="mt-4 text-lg text-slate-600 leading-relaxed">
            {post.excerpt}
          </p>
        </header>
        <div className="prose prose-lg max-w-none">
          {renderMarkdown(post.content)}
        </div>
      </article>
    </div>
  );
};

export default BlogPostPage;
