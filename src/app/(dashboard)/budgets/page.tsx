import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PieChart } from "lucide-react";

export default function BudgetsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Budgets
        </h1>
        <p className="text-muted-foreground">
          Set monthly limits for your categories
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Coming soon
          </CardTitle>
          <CardDescription>
            Budget tracking will be available in the next version. You can
            already create categories and track transactions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Planned features: monthly category budgets, progress bars, and
            overspend alerts.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
