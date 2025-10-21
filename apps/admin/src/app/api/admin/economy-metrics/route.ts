import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";
import { withCache, CacheKeys, CacheTTL } from "@netprophet/lib";

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

    // Use cache for economy metrics (15 minute TTL)
    const cacheKey = CacheKeys.economyMetrics(timePeriod);
    const response = await withCache(
      cacheKey,
      async () => {
        return await fetchEconomyMetrics(timePeriod, supabase);
      },
      CacheTTL.LONG
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error("Economy metrics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch economy metrics" },
      { status: 500 }
    );
  }
}

async function fetchEconomyMetrics(timePeriod: string, supabase: any) {
  try {
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
      if (result.status === "fulfilled" && result.value?.data) {
        // Handle both single objects and arrays
        if (Array.isArray(result.value.data)) {
          // If it's an array, return the first element if it exists
          return result.value.data.length > 0
            ? result.value.data[0]
            : defaultValue;
        } else if (result.value.data[0]) {
          return result.value.data[0];
        }
      }
      return defaultValue;
    };

    // Extract array data for charts
    const getArrayData = (result: any, defaultValue: any[] = []) => {
      if (result.status === "fulfilled" && result.value?.data) {
        if (Array.isArray(result.value.data)) {
          return result.value.data;
        }
      }
      return defaultValue;
    };

    // Helper function to safely extract numeric values
    const getNumericValue = (result: any, defaultValue: number = 0) => {
      const data = getData(result, {});
      if (data && typeof data === "object") {
        // Find the first numeric value in the object
        for (const [key, value] of Object.entries(data)) {
          if (typeof value === "number" && !isNaN(value)) {
            return value;
          }
        }
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
    const coinFlowData = getArrayData(coinFlowResult, []).map((item: any) => ({
      date: item.date,
      inflow: Number(item.inflow),
      outflow: Number(item.outflow),
    }));

    const inflowBreakdown = getArrayData(inflowBreakdownResult, []).map(
      (item: any, index: number) => ({
        name: item.transaction_type,
        value: Number(item.total_amount),
        percentage: Number(item.percentage),
        color: getColorForTransactionType(item.transaction_type, index),
      })
    );

    const outflowBreakdown = getArrayData(outflowBreakdownResult, []).map(
      (item: any, index: number) => ({
        name: item.transaction_type,
        value: Number(item.total_amount),
        percentage: Number(item.percentage),
        color: getColorForTransactionType(item.transaction_type, index),
      })
    );

    const topUsers = getArrayData(topUsersResult, []).map((user: any) => {
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

    const conversionRateTrend = getArrayData(conversionRateResult, []).map(
      (item: any) => ({
        month: item.month,
        rate: Number(item.conversion_rate),
      })
    );

    const burnRatioTrend = getArrayData(burnRatioResult, []).map(
      (item: any) => ({
        month: item.month,
        ratio: Number(item.burn_ratio),
      })
    );

    return {
      success: true,
      data: {
        summary: {
          totalCoinsInjected: Number(coinsInjected?.total_coins_injected || 0),
          totalCoinsBurned: Number(coinsBurned?.total_coins_burned || 0),
          payingUsers: Number(payingUsers?.paying_users_count || 0),
          totalUsers: Number(totalUsers?.total_users_count || 0),
          activeUsers: Number(activeUsers?.active_users_count || 0),
          averageCoinBalance: Math.round(
            Number(averageCoins?.average_coins_per_user || 0)
          ),
          conversionRate: calculateConversionRate(
            payingUsers?.paying_users_count || 0,
            totalUsers?.total_users_count || 0
          ),
          burnRatio: calculateBurnRatio(
            coinsInjected?.total_coins_injected || 0,
            coinsBurned?.total_coins_burned || 0
          ),
        },
        trends: {
          coinsInjectedChange: Number(coinsInjected?.percentage_change || 0),
          coinsBurnedChange: Number(coinsBurned?.percentage_change || 0),
          payingUsersChange: Number(payingUsers?.percentage_change || 0),
          activeUsersChange: Number(activeUsers?.percentage_change || 0),
          averageCoinsChange: Number(averageCoins?.percentage_change || 0),
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
    };
  } catch (error) {
    console.error("Error fetching economy metrics:", error);
    throw error;
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
