import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Lock,
  Sparkles,
  TrendingUp,
  Globe,
  PieChart,
  Lightbulb,
  ChevronRight,
} from 'lucide-react-native';
import { usePortfolioStore } from '@/lib/store';
import { useOnboardingStore } from '@/lib/onboarding-store';
import { useEntitlementStatus } from '@/lib/premium-store';
import { CATEGORY_INFO, SECTOR_INFO, COUNTRY_INFO, Sector, CountryCode } from '@/lib/types';
import { cn } from '@/lib/cn';
import { useTheme } from '@/lib/theme-store';
import { usePortfolioFXRates } from '@/lib/portfolio-fx';
import { generatePortfolioAISnapshot, isOpenAIConfigured, type PortfolioAISnapshot } from '@/lib/openai';

function LockedAnalysisScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme, isDark } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <LinearGradient
        colors={[theme.headerGradientStart, theme.headerGradientEnd]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 500 }}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: insets.top + 20 }} className="px-5">
          <View className="items-center pt-12">
            <View className="w-[100px] h-[100px] rounded-full overflow-hidden">
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                style={{
                  width: 100,
                  height: 100,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Lock size={40} color="white" />
              </LinearGradient>
            </View>

            <Text style={{ color: theme.text }} className="text-2xl font-bold mt-8 text-center">
              Unlock Portfolio Analysis
            </Text>
            <Text style={{ color: theme.textSecondary }} className="text-center mt-3 px-8 leading-6">
              See what’s driving your risk — so you can feel confident about what you own.
            </Text>
          </View>

          {/* Features Preview */}
          <View className="mt-10">
            <FeaturePreview
              icon={<Shield size={24} color="#6366F1" />}
              title="Risk Score Analysis"
              description="Understand your portfolio's overall risk level"
            />
            <FeaturePreview
              icon={<Globe size={24} color="#6366F1" />}
              title="Geographic Concentration"
              description="See how your investments are spread globally"
            />
            <FeaturePreview
              icon={<PieChart size={24} color="#EC4899" />}
              title="Sector Exposure"
              description="Identify overexposure to specific sectors"
            />
            <FeaturePreview
              icon={<Lightbulb size={24} color="#F59E0B" />}
              title="Insight Cards"
              description="Understand exposures without investment advice"
            />
          </View>

          {/* CTA */}
          <View className="mt-10 px-5">
            <Pressable
              onPress={() => {
                console.log('[Premium Debug] Upgrade button clicked:', {
                  location: 'analysis-tab-locked',
                  isPremium: false,
                  timestamp: new Date().toISOString(),
                });
                router.push('/premium');
              }}
            >
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  borderRadius: 16,
                  padding: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Sparkles size={20} color="white" />
                <Text className="text-white font-bold text-lg ml-2">Unlock Premium</Text>
              </LinearGradient>
            </Pressable>

            <Text style={{ color: theme.textTertiary }} className="text-center text-sm mt-4">
              Starting at $4.99/month
            </Text>
          </View>

          {/* Blurred Preview */}
          <View className="mt-10 opacity-40">
            <Text style={{ color: theme.text }} className="text-lg font-semibold mb-4 px-5">
              Preview
            </Text>
            <View className="rounded-2xl mx-5 p-4" style={{ backgroundColor: theme.surface }}>
              <View className="flex-row items-center">
                <View className="w-16 h-16 rounded-full bg-amber-500/20 items-center justify-center">
                  <Text className="text-amber-500 text-2xl font-bold">7</Text>
                </View>
                <View className="ml-4 flex-1">
                  <Text style={{ color: theme.text }} className="font-semibold">
                    Risk Score
                  </Text>
                  <Text style={{ color: theme.textSecondary }} className="text-sm">
                    Moderate-High Risk
                  </Text>
                </View>
              </View>
              <View
                className="h-2 rounded-full mt-4 overflow-hidden"
                style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : theme.borderLight }}
              >
                <View className="h-full w-[70%] bg-amber-500 rounded-full" />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function PremiumAnalysisScreen() {
  const insets = useSafeAreaInsets();
  const assets = usePortfolioStore((s) => s.assets);
  const selectedCurrency = useOnboardingStore((s) => s.selectedCurrency);
  const { theme, isDark } = useTheme();
  const fx = usePortfolioFXRates(assets, selectedCurrency);
  const [aiSnapshot, setAiSnapshot] = React.useState<PortfolioAISnapshot | null>(null);

  // Compute risk analysis with useMemo using real asset data
  const riskAnalysis = React.useMemo(() => {
    const totalValue = assets.reduce((sum, asset) => sum + fx.convert(asset.currentPrice * asset.quantity, asset.currency), 0);

    // Category concentration
    const categoryConcentration: Record<string, number> = {};
    assets.forEach((asset) => {
      const value = fx.convert(asset.currentPrice * asset.quantity, asset.currency);
      const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
      categoryConcentration[asset.category] = (categoryConcentration[asset.category] || 0) + percentage;
    });

    const assetTypeConcentration = Object.entries(categoryConcentration)
      .map(([name, percentage]) => ({
        name: CATEGORY_INFO[name as keyof typeof CATEGORY_INFO]?.label || name,
        percentage,
        riskLevel: (percentage > 40 ? 'high' : percentage > 25 ? 'medium' : 'low') as 'low' | 'medium' | 'high',
      }))
      .sort((a, b) => b.percentage - a.percentage);

    // Real sector concentration from asset data
    const sectorTotals: Record<string, number> = {};
    assets.forEach((asset) => {
      const sector = asset.sector || 'other';
      const value = fx.convert(asset.currentPrice * asset.quantity, asset.currency);
      sectorTotals[sector] = (sectorTotals[sector] || 0) + value;
    });

    const sectorConcentration = Object.entries(sectorTotals)
      .map(([sector, value]) => ({
        name: SECTOR_INFO[sector as Sector]?.label || sector,
        percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
        riskLevel: (value / totalValue * 100 > 40 ? 'high' : value / totalValue * 100 > 25 ? 'medium' : 'low') as 'low' | 'medium' | 'high',
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 6);

    // Real geographic concentration from asset data
    const countryTotals: Record<string, number> = {};
    assets.forEach((asset) => {
      const country = asset.country || 'OTHER';
      const value = fx.convert(asset.currentPrice * asset.quantity, asset.currency);
      countryTotals[country] = (countryTotals[country] || 0) + value;
    });

    const geographicConcentration = Object.entries(countryTotals)
      .map(([country, value]) => ({
        name: COUNTRY_INFO[country as CountryCode]?.name || country,
        flag: COUNTRY_INFO[country as CountryCode]?.flag || '🏳️',
        percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
        riskLevel: (value / totalValue * 100 > 60 ? 'high' : value / totalValue * 100 > 40 ? 'medium' : 'low') as 'low' | 'medium' | 'high',
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 6);

    // Generate suggestions based on real data
    const suggestions: string[] = [];

    const topSector = sectorConcentration[0];
    if (topSector && topSector.percentage > 40) {
      suggestions.push(`${topSector.name} represents ${topSector.percentage.toFixed(0)}% of your portfolio. This concentration may increase exposure to sector-specific risks.`);
    }

    const topCountry = geographicConcentration[0];
    if (topCountry && topCountry.percentage > 60) {
      suggestions.push(`${topCountry.percentage.toFixed(0)}% of your portfolio is in ${topCountry.name}. This concentration may increase exposure to region-specific risks.`);
    }

    const stocksPercent = categoryConcentration['stocks'] || 0;
    const bondsPercent = categoryConcentration['bonds'] || 0;
    const fixedIncomePercent = categoryConcentration['fixed_income'] || 0;

    if (stocksPercent > 50 && (bondsPercent + fixedIncomePercent) < 15) {
      suggestions.push('Your portfolio is equity-heavy relative to fixed income. This mix may be more sensitive to market moves.');
    }

    if (!categoryConcentration['gold'] && !categoryConcentration['physical_metals']) {
      suggestions.push('No precious metals are tracked. If you hold gold or similar assets elsewhere, adding them here can improve completeness of your allocation view.');
    }

    // Calculate overall risk score
    const highRiskCount = [...assetTypeConcentration, ...sectorConcentration, ...geographicConcentration]
      .filter(c => c.riskLevel === 'high').length;

    const overallRiskScore = Math.min(10, Math.max(1, 3 + highRiskCount * 1.5));

    return {
      overallRiskScore,
      sectorConcentration,
      geographicConcentration,
      assetTypeConcentration,
      suggestions,
    };
  }, [assets, fx]);

  const portfolioTotalValue = React.useMemo(() => {
    return assets.reduce((sum, asset) => sum + fx.convert(asset.currentPrice * asset.quantity, asset.currency), 0);
  }, [assets, fx]);

  const aiMutation = useMutation({
    mutationFn: async () => {
      const topCategories = riskAnalysis.assetTypeConcentration.slice(0, 4).map((c) => ({
        name: c.name,
        percentage: Number(c.percentage.toFixed(1)),
      }));
      const topSectors = riskAnalysis.sectorConcentration.slice(0, 4).map((s) => ({
        name: s.name,
        percentage: Number(s.percentage.toFixed(1)),
      }));
      const topCountries = riskAnalysis.geographicConcentration.slice(0, 4).map((c) => ({
        name: c.name,
        percentage: Number(c.percentage.toFixed(1)),
      }));

      const concentrationAlertsCount = [
        ...riskAnalysis.sectorConcentration,
        ...riskAnalysis.geographicConcentration,
      ].filter((x) => x.riskLevel === 'high').length;

      return generatePortfolioAISnapshot({
        baseCurrency: selectedCurrency,
        totalValue: portfolioTotalValue,
        topCategories,
        topSectors,
        topCountries,
        concentrationAlertsCount,
      });
    },
    onSuccess: (result) => {
      if (result.ok) setAiSnapshot(result.data);
    },
  });

  const getRiskColor = (score: number) => {
    // PRD: neutral indicators (avoid red/green). Use a calm palette.
    if (score <= 3) return '#6366F1'; // indigo
    if (score <= 6) return '#A855F7'; // purple
    return '#F59E0B'; // amber
  };

  const getRiskLabel = (score: number) => {
    if (score <= 3) return 'Low Risk';
    if (score <= 6) return 'Moderate Risk';
    return 'High Risk';
  };

  const getRiskLevelColor = (level: 'low' | 'medium' | 'high') => {
    // PRD: neutral indicators (avoid red/green).
    if (level === 'low') return '#6366F1';
    if (level === 'medium') return '#A855F7';
    return '#F59E0B';
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <LinearGradient
        colors={[theme.headerGradientStart, theme.headerGradientEnd]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 400 }}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: insets.top }} className="px-5">
          <View className="flex-row items-center justify-between">
            <Text style={{ color: theme.text }} className="text-2xl font-bold">
              Analysis
            </Text>
            <View className="flex-row items-center bg-amber-500/20 px-3 py-1 rounded-full">
              <Sparkles size={14} color="#F59E0B" />
              <Text className="text-amber-500 text-sm font-medium ml-1">Premium</Text>
            </View>
          </View>

          {/* Risk Score Card */}
          <View className="mt-8">
            <LinearGradient
              colors={['rgba(99, 102, 241, 0.15)', 'rgba(139, 92, 246, 0.1)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 24, padding: 24 }}
            >
              <View className="flex-row items-center">
                <View
                  className="w-20 h-20 rounded-full items-center justify-center"
                  style={{ backgroundColor: getRiskColor(riskAnalysis.overallRiskScore) + '20' }}
                >
                  <Text
                    className="text-3xl font-bold"
                    style={{ color: getRiskColor(riskAnalysis.overallRiskScore) }}
                  >
                    {riskAnalysis.overallRiskScore}
                  </Text>
                </View>
                <View className="ml-4 flex-1">
                  <Text style={{ color: theme.text }} className="text-xl font-semibold">
                    Overall Risk Score
                  </Text>
                  <Text style={{ color: getRiskColor(riskAnalysis.overallRiskScore) }} className="mt-1">
                    {getRiskLabel(riskAnalysis.overallRiskScore)}
                  </Text>
                </View>
              </View>

              {/* Risk Meter */}
              <View className="mt-6">
                <View
                  className="h-3 rounded-full overflow-hidden"
                  style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : theme.borderLight }}
                >
                  <View
                    style={{
                      height: '100%',
                      width: `${riskAnalysis.overallRiskScore * 10}%`,
                      backgroundColor: getRiskColor(riskAnalysis.overallRiskScore),
                      borderRadius: 999,
                    }}
                  />
                </View>
                <View className="flex-row justify-between mt-2">
                  <Text style={{ color: theme.textTertiary }} className="text-xs">
                    Low
                  </Text>
                  <Text style={{ color: theme.textTertiary }} className="text-xs">
                    Moderate
                  </Text>
                  <Text style={{ color: theme.textTertiary }} className="text-xs">
                    High
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* AI Snapshot (optional) */}
          <Animated.View entering={FadeInDown.delay(120)} className="mt-6">
            <View className="flex-row items-center mb-4">
              <Sparkles size={20} color="#F59E0B" />
              <Text style={{ color: theme.text }} className="text-lg font-semibold ml-2">
                AI Snapshot
              </Text>
            </View>

            <View className="rounded-2xl p-4" style={{ backgroundColor: theme.surface }}>
              {!isOpenAIConfigured() ? (
                <Text style={{ color: theme.textSecondary }} className="leading-6">
                  AI insights are optional and currently unavailable (OpenAI key not configured).
                </Text>
              ) : (
                <>
                  <Text style={{ color: theme.textSecondary }} className="leading-6">
                    A quick, calm summary of what your portfolio looks like today — observations only, not advice.
                  </Text>

                  <Pressable
                    onPress={() => aiMutation.mutate()}
                    className="mt-4 rounded-xl py-3 items-center"
                    style={{ backgroundColor: '#F59E0B20' }}
                    disabled={aiMutation.isPending}
                  >
                    <Text className="text-amber-400 font-semibold">
                      {aiMutation.isPending ? 'Generating…' : aiSnapshot ? 'Refresh snapshot' : 'Generate snapshot'}
                    </Text>
                  </Pressable>

                  {aiMutation.data?.ok === false && (
                    <Text className="text-gray-500 text-xs mt-3">
                      {aiMutation.data.reason}
                    </Text>
                  )}

                  {aiSnapshot && (
                    <View className="mt-4">
                      {aiSnapshot.bullets.map((b, idx) => (
                        <View key={`${idx}-${b}`} className={cn('flex-row', idx > 0 && 'mt-3')}>
                          <Text className="text-amber-400 mr-2">•</Text>
                          <Text style={{ color: theme.textSecondary }} className="flex-1 leading-6">
                            {b}
                          </Text>
                        </View>
                      ))}
                      <Text style={{ color: theme.textTertiary }} className="text-[11px] mt-4">
                        Generated {new Date(aiSnapshot.generatedAt).toLocaleString()}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </Animated.View>

          {/* Sector Concentration */}
          <View className="mt-8">
            <View className="flex-row items-center mb-4">
              <TrendingUp size={20} color="#6366F1" />
              <Text style={{ color: theme.text }} className="text-lg font-semibold ml-2">
                Sector Exposure
              </Text>
            </View>

            <View className="rounded-2xl p-4" style={{ backgroundColor: theme.surface }}>
              {riskAnalysis.sectorConcentration.map((sector, index) => (
                <View
                  key={sector.name}
                  className={cn('flex-row items-center', index > 0 && 'mt-4')}
                >
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Text style={{ color: theme.text }}>{sector.name}</Text>
                      {sector.riskLevel === 'high' && (
                        <AlertTriangle size={14} color="#F59E0B" style={{ marginLeft: 8 }} />
                      )}
                    </View>
                    <View
                      className="h-2 rounded-full mt-2 overflow-hidden"
                      style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : theme.borderLight }}
                    >
                      <View
                        className="h-full rounded-full"
                        style={{
                          width: `${sector.percentage}%`,
                          backgroundColor: getRiskLevelColor(sector.riskLevel),
                        }}
                      />
                    </View>
                  </View>
                  <Text
                    className="w-16 text-right font-medium"
                    style={{ color: getRiskLevelColor(sector.riskLevel) }}
                  >
                    {sector.percentage.toFixed(1)}%
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Geographic Concentration */}
          <View className="mt-8">
            <View className="flex-row items-center mb-4">
              <Globe size={20} color="#EC4899" />
              <Text style={{ color: theme.text }} className="text-lg font-semibold ml-2">
                Geographic Exposure
              </Text>
            </View>

            <View className="rounded-2xl p-4" style={{ backgroundColor: theme.surface }}>
              {riskAnalysis.geographicConcentration.map((region, index) => (
                <View
                  key={region.name}
                  className={cn('flex-row items-center', index > 0 && 'mt-4')}
                >
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Text style={{ color: theme.text }}>{region.name}</Text>
                      {region.riskLevel === 'high' && (
                        <AlertTriangle size={14} color="#F59E0B" style={{ marginLeft: 8 }} />
                      )}
                    </View>
                    <View
                      className="h-2 rounded-full mt-2 overflow-hidden"
                      style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : theme.borderLight }}
                    >
                      <View
                        className="h-full rounded-full"
                        style={{
                          width: `${region.percentage}%`,
                          backgroundColor: getRiskLevelColor(region.riskLevel),
                        }}
                      />
                    </View>
                  </View>
                  <Text
                    className="w-16 text-right font-medium"
                    style={{ color: getRiskLevelColor(region.riskLevel) }}
                  >
                    {region.percentage.toFixed(1)}%
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Asset Type Concentration */}
          <View className="mt-8">
            <View className="flex-row items-center mb-4">
              <PieChart size={20} color="#14B8A6" />
              <Text style={{ color: theme.text }} className="text-lg font-semibold ml-2">
                Asset Type Breakdown
              </Text>
            </View>

            <View className="rounded-2xl p-4" style={{ backgroundColor: theme.surface }}>
              {riskAnalysis.assetTypeConcentration.map((type, index) => (
                <View
                  key={type.name}
                  className={cn('flex-row items-center', index > 0 && 'mt-4')}
                >
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Text style={{ color: theme.text }}>{type.name}</Text>
                      {type.riskLevel === 'high' && (
                        <AlertTriangle size={14} color="#F59E0B" style={{ marginLeft: 8 }} />
                      )}
                    </View>
                    <View
                      className="h-2 rounded-full mt-2 overflow-hidden"
                      style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : theme.borderLight }}
                    >
                      <View
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(type.percentage, 100)}%`,
                          backgroundColor: getRiskLevelColor(type.riskLevel),
                        }}
                      />
                    </View>
                  </View>
                  <Text
                    className="w-16 text-right font-medium"
                    style={{ color: getRiskLevelColor(type.riskLevel) }}
                  >
                    {type.percentage.toFixed(1)}%
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Insights */}
          <View className="mt-8">
            <View className="flex-row items-center mb-4">
              <Lightbulb size={20} color="#F59E0B" />
              <Text style={{ color: theme.text }} className="text-lg font-semibold ml-2">
                Insights
              </Text>
            </View>

            {riskAnalysis.suggestions.map((suggestion, index) => (
              <View
                key={index}
                className="rounded-2xl p-4 mb-3"
                style={{ backgroundColor: theme.surface }}
              >
                <View className="flex-row">
                  <View className="w-8 h-8 rounded-full bg-amber-500/20 items-center justify-center">
                    <Text className="text-amber-500 font-bold">{index + 1}</Text>
                  </View>
                  <Text style={{ color: theme.textSecondary }} className="flex-1 ml-3 leading-6">
                    {suggestion}
                  </Text>
                </View>
              </View>
            ))}

            {riskAnalysis.suggestions.length === 0 && (
              <View className="bg-indigo-500/10 rounded-2xl p-4 flex-row items-center">
                <CheckCircle size={24} color="#6366F1" />
                <Text className="text-indigo-400 ml-3 flex-1">
                  No major concentration signals detected from your current tags.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function FeaturePreview({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  const { theme } = useTheme();
  return (
    <View className="flex-row items-center rounded-2xl p-4 mx-5 mb-3" style={{ backgroundColor: theme.surface }}>
      <View
        className="w-12 h-12 rounded-full items-center justify-center"
        style={{ backgroundColor: theme.surfaceHover }}
      >
        {icon}
      </View>
      <View className="flex-1 ml-4">
        <Text style={{ color: theme.text }} className="font-semibold">
          {title}
        </Text>
        <Text style={{ color: theme.textSecondary }} className="text-sm mt-1">
          {description}
        </Text>
      </View>
      <ChevronRight size={16} color={theme.textTertiary} />
    </View>
  );
}

export default function AnalysisScreen() {
  const { isPremium } = useEntitlementStatus();

  if (isPremium) {
    return <PremiumAnalysisScreen />;
  }

  return <LockedAnalysisScreen />;
}
