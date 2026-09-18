"use client";

import { useEffect, useState } from "react";
import AIAssistantAgent from "./AIAssistantAgent";

export default function ClientAssistantWrapper() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return <AIAssistantAgent />;
}
