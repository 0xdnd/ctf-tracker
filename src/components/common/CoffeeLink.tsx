import { Coffee } from 'lucide-react';

export const COFFEE_URL = 'https://buymeacoffee.com/0xdnd';

/** Plain "Buy me a coffee" link (no third-party script). The desktop build opens it in the system browser through utils/externalLinks. */
export function CoffeeLink() {
  return (
    <a href={COFFEE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-6 items-center gap-1 hover:text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded">
      <Coffee className="w-3 h-3" aria-hidden="true" />
      Buy me a coffee
    </a>
  );
}
