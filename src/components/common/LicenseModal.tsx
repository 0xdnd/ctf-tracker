import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Scale, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  X, 
  ExternalLink, 
  Copy, 
  Check, 
  Terminal,
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

  const permitted = [
    ['Personal learning', 'Run, compile, and use locally for individual CTF practice and penetration testing labs (HTB, THM, OffSec).'],
    ['Source code inspection', 'Clone and inspect code for academic research, security auditing, and educational study.'],
    ['Open contributions', "Submit bug reports, feature suggestions, and upstream PRs to Daniel Dayan's official repository."],
    ['Offline personal use', 'Keep private local backups and customized offline configurations for your own study.'],
  ];
  const prohibited = [
    ['No selling or monetization', 'You may NOT sell, rent, license, or charge money/fees for this software in any form.'],
    ['No paid course bundling', 'You may NOT bundle ZeroBox into paid bootcamps, commercial academies, or paywalled services.'],
    ['No public re-publishing', 'You may NOT host public SaaS mirrors, re-publish, or claim authorship under another brand.'],
    ['No stripping attribution', "You may NOT remove Daniel Dayan's name, portfolio links, or copyright notices."],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.12 } }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 bg-surface-inverse/70"
        onClick={() => setLicenseModalOpen(false)}
      />

      {/* Modal container */}
      <motion.div
        initial={{ scale: 0.98, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.98, opacity: 0, y: 8, transition: { duration: 0.12 } }}
        transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
        className="relative w-full max-w-3xl my-auto bg-surface-card border border-subtle rounded-2xl shadow-xl text-primary overflow-hidden z-10 flex flex-col max-h-[90vh] font-sans text-xs"
      >
        {/* Header */}
        <div className="px-4 py-3 bg-surface-card border-b border-subtle flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-muted" />
            <span className="font-semibold text-primary text-sm tracking-tight">License and attribution</span>
            <span className="px-1.5 py-0.5 rounded text-[11px] font-medium font-mono bg-surface-sunken text-secondary border border-subtle">
              ZNSL-1.0
            </span>
          </div>

          <button
            onClick={() => setLicenseModalOpen(false)}
            className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface-hover active:scale-[0.97] transition-[transform,background-color,border-color,color] cursor-pointer [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11 flex items-center justify-center"
            title="Close License (ESC)"
            aria-label="Close license"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Summary */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-muted" />
                <h3 className="text-base sm:text-lg font-semibold text-primary tracking-tight">
                  ZeroBox Source-Available Non-Commercial License
                </h3>
              </div>
              <div className="text-muted text-[11px]">
                Copyright © 2026 <strong className="text-primary font-medium">Daniel Dayan</strong> (<span className="text-secondary">@0xdnd</span>). All Rights Reserved.
              </div>
              <p className="text-secondary text-[12px] leading-relaxed pt-1 max-w-xl">
                ZeroBox is a free, transparent offensive security platform for personal study and educational preparation.
                Commercial monetization, unauthorized public re-publishing, reselling, or removing author attribution is strictly forbidden.
              </p>
            </div>

            <button
              onClick={handleOpenCreatorDossier}
              className="px-3 py-2 rounded-lg bg-surface-card hover:bg-surface-hover border border-subtle hover:border-strong text-primary transition-colors font-medium flex items-center gap-2 flex-shrink-0 cursor-pointer active:scale-[0.97] [@media(pointer:coarse)]:min-h-11"
              title="View Author Dossier & Verified Links"
            >
              <UserCheck className="w-3.5 h-3.5 text-muted" />
              <span>Daniel Dayan</span>
            </button>
          </div>

          {/* Permissions matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-xl bg-surface-sunken border border-subtle space-y-2.5">
              <div className="flex items-center gap-2 text-callout-success-fg font-semibold text-xs pb-1 border-b border-subtle">
                <CheckCircle2 className="w-4 h-4" />
                <span>Permitted uses (non-commercial)</span>
              </div>
              <ul className="space-y-2 text-[12px] text-secondary">
                {permitted.map(([head, body]) => (
                  <li key={head} className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-callout-success-fg mt-1.5 flex-shrink-0" aria-hidden="true" />
                    <span><strong className="text-primary font-medium">{head}:</strong> {body}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-surface-sunken border border-subtle space-y-2.5">
              <div className="flex items-center gap-2 text-callout-danger-fg font-semibold text-xs pb-1 border-b border-subtle">
                <XCircle className="w-4 h-4" />
                <span>Strictly prohibited</span>
              </div>
              <ul className="space-y-2 text-[12px] text-secondary">
                {prohibited.map(([head, body]) => (
                  <li key={head} className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-callout-danger-fg mt-1.5 flex-shrink-0" aria-hidden="true" />
                    <span><strong className="text-primary font-medium">{head}:</strong> {body}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Full legal text */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-muted">
              <div className="flex items-center gap-1.5 font-medium">
                <Terminal className="w-3 h-3" />
                <span>Complete license text</span>
              </div>

              <button
                onClick={handleCopyLicense}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-surface-card border border-subtle hover:border-strong text-muted hover:text-primary transition-colors cursor-pointer"
                title="Copy complete license text to clipboard"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-callout-success-fg" />
                    <span className="text-callout-success-fg font-medium">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy text</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-inverse border border-inverse text-[11px] font-mono text-on-inverse-muted overflow-x-auto max-h-44 scrollbar-thin select-all leading-relaxed whitespace-pre-wrap">
              {FULL_LICENSE_TEXT}
            </div>
          </div>

          {/* Official author links */}
          <div className="pt-3 border-t border-subtle flex flex-wrap items-center justify-between gap-2 text-[12px]">
            <span className="text-muted">Official author channels</span>
            <div className="flex items-center gap-3 flex-wrap">
              <a
                href={CREATOR_PROFILE_LINKS.portfolio}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline font-medium flex items-center gap-1"
              >
                <span>Portfolio</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href={CREATOR_PROFILE_LINKS.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline font-medium flex items-center gap-1"
              >
                <span>LinkedIn</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href={CREATOR_PROFILE_LINKS.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline font-medium flex items-center gap-1"
              >
                <span>GitHub</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href={CREATOR_PROFILE_LINKS.coffee}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline font-medium flex items-center gap-1"
              >
                <Coffee className="w-3 h-3" />
                <span>Buy Me a Coffee</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-surface-card border-t border-subtle flex items-center justify-between gap-3">
          <span className="text-[11px] text-muted">
            Enforced by applicable national and international copyright law.
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLicense}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-card hover:bg-surface-hover text-primary border border-subtle active:scale-[0.97] transition-[transform,background-color,border-color,color] flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-callout-success-fg" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy License'}</span>
            </button>

            <button
              onClick={() => setLicenseModalOpen(false)}
              className="px-4 py-1.5 rounded-lg text-xs font-medium bg-accent hover:bg-accent-hover text-on-accent active:scale-[0.97] transition-[transform,background-color,border-color,color] cursor-pointer"
            >
              Understood & Agree
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
