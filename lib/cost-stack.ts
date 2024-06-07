import { Stack, StackProps } from "aws-cdk-lib";
import { CfnBudget } from "aws-cdk-lib/aws-budgets";
import { Construct } from "constructs";

export class CostStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    new CfnBudget(this, "BudgetForAlerting", {
      budget: {
        budgetName: "BudgetForAlerting-ggrangel-aws-account",
        budgetType: "COST",
        timeUnit: "MONTHLY",
        budgetLimit: {
          amount: 1,
          unit: "USD",
        },
      },

      notificationsWithSubscribers: [
        {
          notification: {
            comparisonOperator: "GREATER_THAN",
            threshold: 100,
            thresholdType: "PERCENTAGE",
            notificationType: "FORECASTED",
          },
          subscribers: [
            { address: "gustavorangel91@gmail.com", subscriptionType: "EMAIL" },
          ],
        },
        {
          notification: {
            comparisonOperator: "GREATER_THAN",
            threshold: 50,
            thresholdType: "PERCENTAGE",
            notificationType: "ACTUAL",
          },
          subscribers: [
            { address: "gustavorangel91@gmail.com", subscriptionType: "EMAIL" },
          ],
        },
      ],
    });
  }
}
