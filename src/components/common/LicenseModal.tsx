import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Scale, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  X, 
  ExternalLink, 
  Globe, 
  Copy, 
  Check, 
  Terminal,
  Lock,
  UserCheck,
  Coffee
} from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { playCyberSound, safeCopyToClipboard, CREATOR_PROFILE_LINKS } from '../../utils/helpers';

const FULL_LICENSE_TEXT = `ZEROBOX SOURCE-AVAILABLE NON-COMMERCIAL & EDUCATIONAL LICENSE (ZNSL 1.0)
========================================================================

Copyright (c) 2026 Daniel Dayan (@0xdnd). All Rights Reserved.
Author Portfolio: https://0xdnd.github.io/
Author GitHub:    https://github.com/0xdnd
Author LinkedIn:  https://www.linkedin.com/in/daniel-dayan-a66322352/

1. GRANT OF PERMITTED RIGHTS
Subject to the terms and restrictions of this License, Daniel Dayan ("Author" / "Licensor")
hereby grants to any person obtaining a copy of this software and associated documentation
files (the "Software"), a non-exclusive, non-transferable, royalty-free license to:
  (a) Inspect, view, clone, and study the source code for personal, educational, and
      academic research purposes.
  (b) Compile, build, and run the Software locally on personal machines or private,
      non-public offline environments for individual penetration testing practice,
      CTF preparation (e.g. Hack The Box, TryHackMe, OffSec labs), and personal study.
  (c) Submit non-commercial bug reports, pull requests, and feedback back to the
      original upstream repository at https://github.com/0xdnd/ctf-tracker.

2. STRICT PROHIBITIONS & COMMERCIAL RESTRICTIONS
The following actions are STRICTLY PROHIBITED:
  (a) NO COMMERCIAL USE OR MONETIZATION: You may NOT sell, resell, rent, lease,
      sub-license, monetize, charge fees for, or derive direct or indirect commercial
      revenue from the Software, in whole or in part, or as part of any commercial
      training course, paid boot-camp, consulting engagement, or commercial SaaS product.
  (b) NO PUBLIC RE-PUBLISHING OR HOSTED SAAS DEPLOYMENT: You may NOT publicly host,
      mirror, deploy as a Software-as-a-Service (SaaS), or publish the Software on any
      public website, platform, application marketplace, or package repository under
      your own name or any organization's name without explicit prior written
      authorization from Daniel Dayan.
  (c) NO DERIVATIVE MONETIZATION OR RE-BRANDING: You may NOT remove, alter, or obscure
      the original creator branding, Daniel Dayan's attribution, portfolio links, GitHub
      links, LinkedIn links, or copyright notices.
  (d) NO PERMISSIVE RE-LICENSING: Derivative works remain bound by this License and
      CANNOT be re-licensed under permissive licenses (such as MIT, Apache 2.0, BSD)
      that would permit commercial exploitation or unattributed re-distribution.

3. ATTRIBUTION REQUIREMENT
Any permitted reference, academic citation, or educational mention of the Software MUST
prominently display the following attribution notice:
  "ZeroBox Tactical CTF Platform is authored and copyrighted by Daniel Dayan (@0xdnd).
   Official Portfolio: https://0xdnd.github.io/
   Official Repository: https://github.com/0xdnd/ctf-tracker"

4. DISCLAIMER OF WARRANTY
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.`;

export const LicenseModal: React.FC = () => {
  const licenseModalOpen = useCtfStore((s) => s.licenseModalOpen);
  const setLicenseModalOpen = useCtfStore((s) => s.setLicenseModalOpen);
  const setOperatorModalOpen = useCtfStore((s) => s.setOperatorModalOpen);
  const soundEnabled = useCtfStore((s) => s.soundEnabled);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (licenseModalOpen) {
      if (soundEnabled) playCyberSound('engage');
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          setLicenseModalOpen(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [licenseModalOpen, setLicenseModalOpen, soundEnabled]);

  const handleCopyLicense = async () => {
    await safeCopyToClipboard(FULL_LICENSE_TEXT);
    setCopied(true);
    if (soundEnabled) playCyberSound('copy');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenCreatorDossier = () => {
    setLicenseModalOpen(false);
    setOperatorModalOpen(true);
    if (soundEnabled) playCyberSound('click');
  };

  if (!licenseModalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
        {/* Dark Cyber Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
          onClick={() => setLicenseModalOpen(false)}
        />

        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative w-full max-w-3xl my-auto bg-[#0d121f] border border-cyber-amber/50 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.25)] text-gray-200 overflow-hidden z-10 flex flex-col max-h-[90vh] font-mono text-xs"
        >
          {/* Top Tactical Terminal Header */}
          <div className="px-5 py-3.5 bg-[#080c14] border-b border-cyber-border/80 flex items-center justify-between select-none">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyber-amber animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
              <Scale className="w-4 h-4 text-cyber-amber" />
              <span className="font-bold text-cyber-amber tracking-wider uppercase">
                ZEROBOX // LEGAL & INTELLECTUAL PROPERTY COVENANT
              </span>
              <span className="px-2 py-0.5 rounded text-[9px] font-black bg-cyber-amber/20 text-cyber-amber border border-cyber-amber/40">
                ZNSL-1.0
              </span>
            </div>

            <button
              onClick={() => setLicenseModalOpen(false)}
              className="p-1.5 rounded-lg text-cyber-muted hover:text-white hover:bg-cyber-card transition-all"
              title="Close License (ESC)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto p-5 sm:p-6 space-y-5">
            {/* Hero Header Card */}
            <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-br from-cyber-card/90 via-cyber-bg to-[#1a150c] border border-cyber-amber/40 relative overflow-hidden shadow-lg">
              <div className="absolute top-0 right-0 w-48 h-48 bg-cyber-amber/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-cyber-amber" />
                    <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                      ZeroBox Source-Available Non-Commercial License
                    </h3>
                  </div>
                  <div className="text-cyber-muted text-[11px]">
                    Copyright © 2026 <strong className="text-cyber-emerald">Daniel Dayan</strong> (<span className="text-cyber-cyan">@0xdnd</span>). All Rights Reserved.
                  </div>
                  <p className="text-gray-300 text-[11px] leading-relaxed pt-1 max-w-xl">
                    ZeroBox is engineered as a free, transparent offensive cybersecurity platform for personal study and educational preparation. 
                    Commercial monetization, unauthorized public re-publishing, reselling, or removing author attribution is strictly forbidden.
                  </p>
                </div>

                <button
                  onClick={handleOpenCreatorDossier}
                  className="px-3 py-2 rounded-xl bg-cyber-emerald/15 hover:bg-cyber-emerald/25 border border-cyber-emerald/40 hover:border-cyber-emerald text-cyber-emerald hover:text-white transition-all font-bold flex items-center gap-2 flex-shrink-0"
                  title="View Author Dossier & Verified Links"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>DANIEL DAYAN</span>
                </button>
              </div>
            </div>

            {/* Permissions Matrix: Allowed vs Prohibited */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* ALLOWED */}
              <div className="p-4 rounded-xl bg-cyber-card/70 border border-cyber-emerald/40 space-y-2.5">
                <div className="flex items-center gap-2 text-cyber-emerald font-bold text-xs uppercase tracking-wider pb-1 border-b border-cyber-emerald/20">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>✅ PERMITTED USES (NON-COMMERCIAL)</span>
                </div>
                <ul className="space-y-2 text-[11px] text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-cyber-emerald font-bold mt-0.5">•</span>
                    <span><strong>Personal Learning:</strong> Run, compile, and use locally for individual CTF practice and penetration testing labs (HTB, THM, OffSec).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyber-emerald font-bold mt-0.5">•</span>
                    <span><strong>Source Code Inspection:</strong> Clone and inspect code for academic research, security auditing, and educational study.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyber-emerald font-bold mt-0.5">•</span>
                    <span><strong>Open Contributions:</strong> Submit bug reports, feature suggestions, and upstream PRs to Daniel Dayan's official repository.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyber-emerald font-bold mt-0.5">•</span>
                    <span><strong>Offline Personal Use:</strong> Keep private local backups and customized offline configurations for your own study.</span>
                  </li>
                </ul>
              </div>

              {/* FORBIDDEN */}
              <div className="p-4 rounded-xl bg-cyber-card/70 border border-cyber-crimson/40 space-y-2.5">
                <div className="flex items-center gap-2 text-cyber-crimson font-bold text-xs uppercase tracking-wider pb-1 border-b border-cyber-crimson/20">
                  <XCircle className="w-4 h-4" />
                  <span>❌ STRICTLY PROHIBITED (VIOLATIONS)</span>
                </div>
                <ul className="space-y-2 text-[11px] text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-cyber-crimson font-bold mt-0.5">•</span>
                    <span><strong>No Selling / Monetization:</strong> You may NOT sell, rent, license, or charge money/fees for this software in any form.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyber-crimson font-bold mt-0.5">•</span>
                    <span><strong>No Paid Course Bundling:</strong> You may NOT bundle ZeroBox into paid bootcamps, commercial academies, or paywalled services.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyber-crimson font-bold mt-0.5">•</span>
                    <span><strong>No Public Re-Publishing:</strong> You may NOT host public SaaS mirrors, re-publish, or claim authorship under another brand.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyber-crimson font-bold mt-0.5">•</span>
                    <span><strong>No Stripping Attribution:</strong> You may NOT remove Daniel Dayan's name, portfolio links, or copyright notices.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Full Legal Text Scrollable Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] text-cyber-muted uppercase tracking-wider">
                <div className="flex items-center gap-1.5 font-bold">
                  <Terminal className="w-3 h-3 text-cyber-amber" />
                  <span>COMPLETE LEGAL TEXT COVENANT</span>
                </div>

                <button
                  onClick={handleCopyLicense}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyber-card border border-cyber-border hover:border-cyber-amber text-cyber-muted hover:text-white transition-all"
                  title="Copy complete license text to clipboard"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-cyber-emerald" />
                      <span className="text-cyber-emerald font-bold">COPIED!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>COPY TEXT</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-black/60 border border-cyber-border/70 text-[10px] font-mono text-gray-400 overflow-x-auto max-h-44 scrollbar-thin select-all leading-relaxed whitespace-pre-wrap">
                {FULL_LICENSE_TEXT}
              </div>
            </div>

            {/* Direct Official Author Links */}
            <div className="p-3 rounded-xl bg-[#080c14] border border-cyber-border/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyber-emerald" />
                <span className="text-gray-400">Official Author Verified Channels:</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={CREATOR_PROFILE_LINKS.portfolio}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyber-emerald hover:underline font-bold flex items-center gap-1"
                >
                  <span>Portfolio</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span className="text-cyber-border">•</span>
                <a
                  href={CREATOR_PROFILE_LINKS.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0077B5] hover:underline font-bold flex items-center gap-1"
                >
                  <span>LinkedIn</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span className="text-cyber-border">•</span>
                <a
                  href={CREATOR_PROFILE_LINKS.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:underline font-bold flex items-center gap-1"
                >
                  <span>GitHub</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span className="text-cyber-border">•</span>
                <a
                  href={CREATOR_PROFILE_LINKS.coffee}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#FFDD00] hover:underline font-bold flex items-center gap-1"
                >
                  <Coffee className="w-3 h-3" />
                  <span>Buy Me a Coffee</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="px-5 py-3 bg-[#080c14] border-t border-cyber-border/80 flex items-center justify-between gap-3">
            <span className="text-[10px] text-cyber-muted">
              Enforced by applicable national and international copyright law.
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLicense}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-cyber-card hover:bg-cyber-card/80 text-gray-200 border border-cyber-border transition-all flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-cyber-emerald" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy License'}</span>
              </button>

              <button
                onClick={() => setLicenseModalOpen(false)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-cyber-amber hover:bg-cyber-amber/90 text-black shadow-[0_0_12px_rgba(245,158,11,0.3)] transition-all"
              >
                Understood & Agree
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
