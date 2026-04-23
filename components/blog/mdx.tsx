import Link from 'next/link'
import type { MDXComponents } from 'mdx/types'

export const mdxComponents: MDXComponents = {
  h1: props => <h1 className="text-3xl font-bold mt-8 mb-4 text-text-primary" {...props} />,
  h2: props => <h2 className="text-2xl font-bold mt-10 mb-4 text-text-primary scroll-mt-20" {...props} />,
  h3: props => <h3 className="text-xl font-semibold mt-8 mb-3 text-text-primary scroll-mt-20" {...props} />,
  h4: props => <h4 className="text-lg font-semibold mt-6 mb-2 text-text-primary" {...props} />,
  p: props => <p className="my-4 leading-relaxed text-text-secondary" {...props} />,
  ul: props => <ul className="my-4 ml-6 list-disc space-y-2 text-text-secondary" {...props} />,
  ol: props => <ol className="my-4 ml-6 list-decimal space-y-2 text-text-secondary" {...props} />,
  li: props => <li className="leading-relaxed" {...props} />,
  blockquote: props => (
    <blockquote
      className="my-6 border-l-4 border-primary/60 bg-surface pl-4 py-2 italic text-text-secondary"
      {...props}
    />
  ),
  code: props => (
    <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[0.9em] font-mono" {...props} />
  ),
  pre: props => (
    <pre
      className="my-6 overflow-x-auto rounded-lg border border-border bg-surface p-4 text-sm"
      {...props}
    />
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  a: ({ href, ...props }: any) => {
    if (href?.startsWith('/')) {
      return <Link href={href} className="text-primary hover:underline" {...props} />
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline"
        {...props}
      />
    )
  },
  table: props => (
    <div className="my-6 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: props => (
    <th className="border-b border-border px-3 py-2 text-left font-semibold" {...props} />
  ),
  td: props => <td className="border-b border-border/60 px-3 py-2" {...props} />,
  hr: props => <hr className="my-10 border-border" {...props} />,
}
