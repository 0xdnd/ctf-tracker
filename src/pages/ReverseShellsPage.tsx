import React from 'react';
import { motion } from 'framer-motion';
import { Terminal } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { YourDetailsCard } from '../components/cheatsheet/YourDetailsCard';
import { ReverseShellGenerator } from '../components/cheatsheet/ReverseShellGenerator';

/** Reverse shell generator as its own section. LHOST / LPORT / TARGET are shared with the Snippets page. */
export const ReverseShellsPage: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2 }}
    className="mx-auto w-full max-w-6xl space-y-6 pb-12 text-sm"
  >
    <PageHeader
      title="Reverse shells"
      icon={<Terminal />}
      description="A reverse shell makes a target machine connect back to yours, so you can control it. Pick a payload, copy it, and start your listener first."
    />

    <YourDetailsCard tourAnchor="rs-details" />

    <ReverseShellGenerator />
  </motion.div>
);

export default ReverseShellsPage;
