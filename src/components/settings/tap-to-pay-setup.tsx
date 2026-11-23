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
              Open the <b>Shortcuts</b> app and tap <b>Automation</b> at the
              bottom.
            </li>
            <li>
              Tap <b>+</b> (top right), scroll down and choose{" "}
              <b>Transaction</b>.
            </li>
            <li>
              Tick your Wallet cards, choose <b>Run Immediately</b>, then tap{" "}
              <b>Next</b>.
            </li>
            <li>
              Tap <b>New Blank Automation</b> → <b>Add Action</b>, search for{" "}
              <b>Open URLs</b> and tap it.
            </li>
            <li>
              Tap the blue <b>URL</b> word, paste the link from step 1, and tap{" "}
              <b>Done</b>.
            </li>
          </ol>
        </div>

        <div className="space-y-1">
          <p className="font-medium">3. Tap to pay</p>
          <p className="text-muted-foreground">
            After each Apple Pay payment, My Money opens with a popup. Type the
            amount and a note, pick the account and category, and tap{" "}
            <b>Save expense</b>.
          </p>
        </div>

        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium">
            Optional: fill in the amount automatically
          </summary>
          <p className="mt-2">
            In the <b>Open URLs</b> action, tap at the end of the link and type{" "}
            <code>&amp;amount=</code>, then tap <b>Shortcut Input</b> above the
            keyboard and pick <b>Amount</b>. Do the same with{" "}
            <code>&amp;merchant=</code> + <b>Merchant</b> and{" "}
            <code>&amp;card=</code> + <b>Card or Pass</b>. The popup then shows
            the payment ready to record in one tap. The account is matched by
            card name (name your account like the Wallet card) and the category
            is reused from your last expense at the same merchant.
          </p>
        </details>
      </CardContent>
    </Card>
  );
}
