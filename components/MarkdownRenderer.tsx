import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const AlertIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'NOTE':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-sky-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      );
    case 'IMPORTANT':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-violet-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3-3z" /></svg>
      );
    case 'WARNING':
    case 'CAUTION':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
      );
    case 'TIP':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
      );
    case 'QUESTION':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-pink-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      );
    default:
      return null;
  }
};

/**
 * Custom Remark Plugin to parse GitHub Flavored Alerts (e.g., [!NOTE])
 * directly from the AST (Abstract Syntax Tree) before React rendering.
 */
const remarkAlertsPlugin = () => {
  return (tree: any) => {
    const visit = (node: any) => {
      if (node.type === 'blockquote') {
        // Check if the blockquote content starts with an alert tag
        if (node.children && node.children.length > 0 && node.children[0].type === 'paragraph') {
          const paragraph = node.children[0];
          if (paragraph.children && paragraph.children.length > 0 && paragraph.children[0].type === 'text') {
            const textNode = paragraph.children[0];
            const content = textNode.value;
            // Regex to find [!NOTE], [!TIP], etc., case insensitive
            const match = content.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|QUESTION)\]/i);
            
            if (match) {
              const alertType = match[1].toUpperCase();
              
              // Inject the alert type into the blockquote's data properties
              // These will be available in the `node` prop of the custom component
              if (!node.data) node.data = {};
              if (!node.data.hProperties) node.data.hProperties = {};
              node.data.hProperties['data-alert-type'] = alertType;

              // Remove the tag from the text content so it doesn't render
              const newText = content.replace(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|QUESTION)\]\s*/i, '');
              
              if (!newText.trim()) {
                // If text node is empty after removal, remove the node to avoid empty space
                paragraph.children.shift();
              } else {
                textNode.value = newText;
              }
            }
          }
        }
      }

      // Continue traversing
      if (node.children) {
        node.children.forEach((child: any) => visit(child));
      }
    };

    visit(tree);
  };
};

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  
  const sanitizedContent = useMemo(() => {
    return DOMPurify.sanitize(content);
  }, [content]);

  return (
    <div className={`markdown-body text-gray-200 leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkAlertsPlugin]}
        components={{
          h1: ({ children }) => <h1 className="text-3xl md:text-4xl font-extrabold mt-12 mb-8 pb-4 border-b border-gray-700 text-white tracking-tight">{children}</h1>,
          h2: ({ children }) => <h2 className="text-2xl md:text-3xl font-bold mt-10 mb-6 text-sky-50 border-b border-white/10 pb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-xl font-semibold mt-8 mb-4 text-sky-300">{children}</h3>,
          h4: ({ children }) => <h4 className="text-lg font-medium mt-6 mb-3 text-gray-100">{children}</h4>,
          
          p: ({ children }) => <p className="mb-6 text-gray-300 leading-8 text-lg">{children}</p>,
          strong: ({ children }) => <strong className="font-bold text-sky-400">{children}</strong>,
          em: ({ children }) => <em className="text-gray-400 italic">{children}</em>,
          
          ul: ({ children }) => <ul className="space-y-3 my-6 pl-4">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-outside space-y-3 my-6 pl-8 marker:text-sky-500 marker:font-bold text-gray-300 text-lg">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,

          blockquote: ({ node, children, ...props }: any) => {
            // Retrieve the data injected by our remark plugin
            const alertType = node?.data?.hProperties?.['data-alert-type'];

            if (alertType) {
              const styles: Record<string, string> = {
                NOTE: 'bg-sky-950/40 border-sky-500 text-sky-100 shadow-[0_0_15px_rgba(14,165,233,0.15)]',
                TIP: 'bg-emerald-950/40 border-emerald-500 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.15)]',
                IMPORTANT: 'bg-violet-950/40 border-violet-500 text-violet-100 shadow-[0_0_15px_rgba(139,92,246,0.15)]',
                WARNING: 'bg-amber-950/40 border-amber-500 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.15)]',
                CAUTION: 'bg-red-950/40 border-red-500 text-red-100 shadow-[0_0_15px_rgba(239,68,68,0.15)]',
                QUESTION: 'bg-pink-950/40 border-pink-500 text-pink-100 shadow-[0_0_15px_rgba(236,72,153,0.15)]',
              };
              
              const titles: Record<string, string> = {
                NOTE: 'Nota',
                TIP: 'Dica Prática',
                IMPORTANT: 'Importante',
                WARNING: 'Atenção',
                CAUTION: 'Cuidado',
                QUESTION: 'Reflexão'
              };

              return (
                <div className={`my-8 rounded-r-xl border-l-[6px] backdrop-blur-md ${styles[alertType] || styles.NOTE} overflow-hidden`}>
                  <div className="flex items-center gap-3 px-5 py-3 bg-black/20 border-b border-white/5">
                    <AlertIcon type={alertType} />
                    <span className="font-bold uppercase tracking-wider text-sm">{titles[alertType] || alertType}</span>
                  </div>
                  <div className="p-5 text-lg opacity-90 leading-relaxed">
                    {children}
                  </div>
                </div>
              );
            }

            // Default blockquote
            return (
              <blockquote className="border-l-4 border-gray-600 pl-6 py-3 my-8 bg-gray-800/30 italic text-gray-400 text-lg rounded-r-lg" {...props}>
                {children}
              </blockquote>
            );
          },

          code: ({ node, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && !String(children).includes('\n');
            return isInline ? (
              <code className="px-2 py-1 rounded-md bg-gray-800 text-pink-400 font-mono text-sm border border-white/10 shadow-sm" {...props}>
                {children}
              </code>
            ) : (
              <div className="my-8 rounded-xl overflow-hidden border border-white/10 bg-[#0d1117] shadow-2xl">
                 <div className="flex items-center px-4 py-3 bg-white/5 border-b border-white/5 justify-between">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                    </div>
                    {match && <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">{match[1]}</span>}
                 </div>
                 <div className="p-5 overflow-x-auto">
                    <code className={`${className} block font-mono text-sm text-gray-300 leading-relaxed`} {...props}>
                        {children}
                    </code>
                 </div>
              </div>
            );
          },
          
          hr: () => <hr className="my-12 border-gray-700/50" />,
          a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 font-medium underline decoration-sky-400/30 underline-offset-4 transition-all hover:decoration-sky-300">{children}</a>,
          img: ({ src, alt }) => (
             <figure className="my-10 group">
                <div className="overflow-hidden rounded-xl border border-white/10 shadow-2xl bg-black/20">
                    <img src={src} alt={alt} className="w-full h-auto max-w-4xl mx-auto transform transition-transform duration-700 group-hover:scale-[1.02]" loading="lazy" />
                </div>
                {alt && <figcaption className="text-center text-sm text-gray-500 mt-3 italic">{alt}</figcaption>}
             </figure>
          )
        }}
      >
        {sanitizedContent}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;