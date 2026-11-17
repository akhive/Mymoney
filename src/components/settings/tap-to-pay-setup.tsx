"use client";

import { useEffect, useState } from "react";
import { Smartphone, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Explains how to connect Apple Pay (tap) payments to My Money using an
 * iOS Shortcuts "Transaction" automation (iOS 17+).
 */
export function TapToPaySetup() {
  const [baseUrl, setBaseUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setBaseUrl(`${window.location.origin}/transactions/new?source=tap`);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(baseUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable; the URL is still visible to copy.
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          iPhone tap-to-pay
        </CardTitle>
        <CardDescription>
          Get a popup asking to record an expense each time you pay with
          Apple Pay
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-2">
          <p className="font-medium">1. Copy this link</p>
          <div className="flex gap-2">
            <code className="flex-1 break-all rounded-md border bg-muted px-3 py-2 text-xs">
              {baseUrl || "…"}
            </code>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={copy}
              aria-label="Copy link"
            >
              {copied ? <Check /> : <Copy />}
            </Button>
          </div>
        </div>

        <div className="space-y-1">
          <p className="font-medium">2. Create the automation on your iPhone</p>
          <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>
              Open the <b>Shortcuts</b> app → <b>Automation</b> → <b>+</b> →{" "}
              <b>Transaction</b>.
            </li>
            <li>
              Select your Wallet cards, choose <b>Run Immediately</b>, tap{" "}
              <b>Next</b> → <b>New Blank Automation</b>.
            </li>
            <li>
              Add a <b>URL</b> action and paste the link. At the end, type{" "}
              <code>&amp;amount=</code> and insert the variable{" "}
              <b>Shortcut Input → Amount</b>, then <code>&amp;merchant=</code>{" "}
              + <b>Merchant</b>, then <code>&amp;card=</code> +{" "}
              <b>Card or Pass</b>.
            </li>
            <li>
              Add an <b>Open URLs</b> action below it. Done.
            </li>
          </ol>
        </div>

        <div className="space-y-1">
          <p className="font-medium">3. Tap to pay</p>
          <p className="text-muted-foreground">
            After each Apple Pay payment, My Money opens with a popup showing
            the amount and merchant. Tap <b>Record as expense</b> to save it,
            or <b>Edit details first</b>. The account is matched by the card
            name (name your account like the Wallet card, e.g. &quot;HDFC
            Credit Card&quot;), and the category is reused from your last
            expense at the same merchant.
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          Tip: to be asked on the iPhone first instead of jumping straight into
          the app, put a <b>Choose from Menu</b> action (&quot;Record
          expense?&quot; → Yes / No) before <b>Open URLs</b> and move{" "}
          <b>Open URLs</b> under &quot;Yes&quot;.
        </p>
      </CardContent>
    </Card>
  );
}
