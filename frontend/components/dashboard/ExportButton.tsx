"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Copy } from "@phosphor-icons/react";

interface ExportButtonProps {
  exportText: string;
}

export function ExportButton({ exportText }: ExportButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  };

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleCopy}
    >
      <Copy size={16} className="mr-1.5" />
      {copied ? "Copied!" : "Export data"}
    </Button>
  );
}
