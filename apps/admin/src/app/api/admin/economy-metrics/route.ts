import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  try {
    // Authenticate and authorize admin user
    const authResult = await requireAdmin(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { searchParams } = new URL(request.url);
    const timePeriod = searchParams.get("timePeriod") || "month";

    // Fetch all economy metrics in parallel with timeout protection
    const timeoutMs = 10000; // 10 second timeout per RPC call

    const [
      coinsInjectedResult,
      coinsBurnedResult,
      payingUsersResult,
      averageCoinsResult,
      totalUsersResult,
      activeUsersResult,
      coinFlowResult,
      inflowBreakdownResult,
      outflowBreakdownResult,
      topUsersResult,
      conversionRateResult,
      burnRatioResult,
    ] = await Promise.allSettled([
      Promise.race([
        supabase.rpc("get_total_coins_injected", { time_period: timePeriod }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), timeoutMs)
        ),
      ]),
      Promise.race([
        supabase.rpc("get_total_coins_burned", { time_period: timePeriod }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), timeoutMs)
        ),
      ]),
      Promise.race([
        supabase.rpc("get_paying_users_count", { time_period: timePeriod }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), timeoutMs)
        ),
      ]),
      Promise.race([
        supabase.rpc("get_average_coins_per_user", { time_period: timePeriod }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), timeoutMs)
        ),
      ]),
      Promise.race([
        supabase.rpc("get_total_users_count"),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), timeoutMs)
        ),
      ]),
      Promise.race([
        supabase.rpc("get_active_users_count"),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), timeoutMs)
        ),
      ]),
      Promise.race([
        supabase.rpc("get_coin_flow_data", {
          time_period: timePeriod,
          days_back: 30,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), timeoutMs)
        ),
      ]),
      Promise.race([
        supabase.rpc("get_inflow_breakdown", { time_period: timePeriod }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), timeoutMs)
        ),
      ]),
      Promise.race([
        supabase.rpc("get_outflow_breakdown", { time_period: timePeriod }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), timeoutMs)
        ),
      ]),
      Promise.race([
        supabase.rpc("get_top_users_by_spend", { limit_count: 10 }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), timeoutMs)
        ),
      ]),
      Promise.race([
        supabase.rpc("get_conversion_rate_trend", { months_back: 4 }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), timeoutMs)
        ),
      ]),
      Promise.race([
        supabase.rpc("get_burn_ratio_trend", { months_back: 4 }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), timeoutMs)
        ),
      ]),
    ]);

    // Check for errors (handle Promise.allSettled results)
    const results = [
      coinsInjectedResult,
      coinsBurnedResult,
      payingUsersResult,
      averageCoinsResult,
      totalUsersResult,
      activeUsersResult,
      coinFlowResult,
      inflowBreakdownResult,
      outflowBreakdownResult,
      topUsersResult,
      conversionRateResult,
      burnRatioResult,
    ];

    const errors = results
      .filter((result) => result.status === "rejected")
      .map((result) => result.reason);

    if (errors.length > 0) {
      console.error("Database errors:", errors);
      // Continue with partial data instead of failing completely
    }

    // Extract data (handle Promise.allSettled results)
    const getData = (result: any, defaultValue: any) => {
      if (result.status === "fulfilled" && result.value?.data?.[0]) {
        return result.value.data[0];
      }
      return defaultValue;
    };

    const coinsInjected = getData(coinsInjectedResult, {
      total_coins_injected: 0,
      previous_period_coins: 0,
      percentage_change: 0,
    });
    const coinsBurned = getData(coinsBurnedResult, {
      total_coins_burned: 0,
      previous_period_coins: 0,
      percentage_change: 0,
    });
    const payingUsers = getData(payingUsersResult, {
      paying_users_count: 0,
      previous_period_count: 0,
      percentage_change: 0,
    });
    const averageCoins = getData(averageCoinsResult, {
      average_coins_per_user: 0,
      previous_period_average: 0,
      percentage_change: 0,
    });
    const totalUsers = getData(totalUsersResult, { total_users_count: 0 });
    const activeUsers = getData(activeUsersResult, {
      active_users_count: 0,
      previous_period_count: 0,
      percentage_change: 0,
    });

    // Transform data for charts (handle Promise.allSettled results)
    const coinFlowData = getData(coinFlowResult, []).map((item: any) => ({
      date: item.date,
      inflow: Number(item.inflow),
      outflow: Number(item.outflow),
    }));

    const inflowBreakdown = getData(inflowBreakdownResult, []).map(
      (item: any, index: number) => ({
        name: item.transaction_type,
        value: Number(item.total_amount),
        percentage: Number(item.percentage),
        color: getColorForTransactionType(item.transaction_type, index),
      })
    );

    const outflowBreakdown = getData(outflowBreakdownResult, []).map(
      (item: any, index: number) => ({
        name: item.transaction_type,
        value: Number(item.total_amount),
        percentage: Number(item.percentage),
        color: getColorForTransactionType(item.transaction_type, index),
      })
    );

    const topUsers = getData(topUsersResult, []).map((user: any) => {
      const totalSpent = Number(user.total_spent);
      const lastSpend = user.last_spend;
      const betsPlaced = Number(user.bets_placed);

      // Calculate days since last spend
      const daysSinceLastSpend = lastSpend
        ? Math.floor(
            (Date.now() - new Date(lastSpend).getTime()) / (1000 * 60 * 60 * 24)
          )
        : 999;

      // Determine status badge
      let tier = "";
      let color = "";

      if (totalSpent >= 10000) {
        tier = "Whale";
        color = "bg-purple-100 text-purple-800";
      } else if (totalSpent >= 5000) {
        tier = "VIP";
        color = "bg-yellow-100 text-yellow-800";
      } else if (totalSpent >= 1000) {
        tier = "Regular";
        color = "bg-blue-100 text-blue-800";
      } else if (totalSpent >= 100) {
        tier = "Casual";
        color = "bg-green-100 text-green-800";
      } else {
        tier = "New";
        color = "bg-gray-100 text-gray-800";
      }

      // Add inactivity indicator
      if (daysSinceLastSpend > 30) {
        tier += " (Inactive)";
        color = "bg-gray-100 text-gray-600";
      }

      return {
        username: user.username || "Unknown",
        totalSpent,
        lastSpend,
        betsPlaced,
        status: { label: tier, color },
      };
    });

    const conversionRateTrend = getData(conversionRateResult, []).map(
      (item: any) => ({
        month: item.month,
        rate: Number(item.conversion_rate),
      })
    );

    const burnRatioTrend = getData(burnRatioResult, []).map((item: any) => ({
      month: item.month,
      ratio: Number(item.burn_ratio),
    }));

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalCoinsInjected: Number(coinsInjected.total_coins_injected),
          totalCoinsBurned: Number(coinsBurned.total_coins_burned),
          payingUsers: Number(payingUsers.paying_users_count),
          totalUsers: Number(totalUsers.total_users_count),
          activeUsers: Number(activeUsers.active_users_count),
          averageCoinBalance: Math.round(
            Number(averageCoins.average_coins_per_user)
          ),
          conversionRate: calculateConversionRate(
            payingUsers.paying_users_count,
            totalUsers.total_users_count
          ),
          burnRatio: calculateBurnRatio(
            coinsInjected.total_coins_injected,
            coinsBurned.total_coins_burned
          ),
        },
        trends: {
          coinsInjectedChange: Number(coinsInjected.percentage_change),
          coinsBurnedChange: Number(coinsBurned.percentage_change),
          payingUsersChange: Number(payingUsers.percentage_change),
          activeUsersChange: Number(activeUsers.percentage_change),
          averageCoinsChange: Number(averageCoins.percentage_change),
        },
        charts: {
          coinFlowData,
          inflowBreakdown,
          outflowBreakdown,
          conversionRateTrend,
          burnRatioTrend,
        },
        topUsers,
      },
    });
  } catch (error) {
    console.error("Error fetching economy metrics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to get colors for transaction types
function getColorForTransactionType(type: string, index: number): string {
  const colorMap: { [key: string]: string } = {
    purchase: "#10b981", // Green for purchases
    daily_login: "#f59e0b", // Yellow for daily rewards
    welcome_bonus: "#3b82f6", // Blue for welcome bonus
    referral_bonus: "#8b5cf6", // Purple for referral bonus
    leaderboard_prize: "#06b6d4", // Cyan for prizes
    bet: "#ef4444", // Red for bets
    loss: "#dc2626", // Dark red for losses
    power_up: "#06b6d4", // Cyan for power-ups
    tournament_entry: "#f97316", // Orange for tournament entries
  };

  return colorMap[type] || getDefaultColor(index);
}

function getDefaultColor(index: number): string {
  const colors = [
    "#10b981",
    "#f59e0b",
    "#3b82f6",
    "#8b5cf6",
    "#06b6d4",
    "#ef4444",
    "#dc2626",
    "#f97316",
  ];
  return colors[index % colors.length];
}

// Helper function to calculate conversion rate
function calculateConversionRate(
  payingUsers: number,
  totalUsers: number
): number {
  if (totalUsers === 0) return 0;
  return (payingUsers / totalUsers) * 100;
}

// Helper function to calculate burn ratio
function calculateBurnRatio(injected: number, burned: number): number {
  if (injected === 0) return 0;
  return (burned / injected) * 100;
}
