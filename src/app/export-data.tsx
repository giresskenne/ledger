import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, FileSpreadsheet, FileJson, FileText, Download, Sparkles, Lock, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Burnt from 'burnt';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { usePortfolioStore } from '@/lib/store';
import { useEntitlementStatus } from '@/lib/premium-store';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/lib/theme-store';
import { Asset, CATEGORY_INFO, COUNTRY_INFO, CountryCode } from '@/lib/types';

const EXPORT_FORMATS = [
  {
    id: 'excel',
    name: 'Excel (CSV)',
    description: 'Tax-ready spreadsheet with gains/losses',
    icon: FileSpreadsheet,
    color: '#10B981',
    extension: '.csv',
  },
  {
    id: 'json',
    name: 'JSON',
    description: 'Raw data for developers & backup',
    icon: FileJson,
    color: '#6366F1',
    extension: '.json',
  },
  {
    id: 'pdf',
    name: 'Tax Report (HTML)',
    description: 'Printable report for USA, Canada, UK',
    icon: FileText,
    color: '#EF4444',
    extension: '.html → Print to PDF',
  },
];

export default function ExportDataScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { isPremium } = useEntitlementStatus();
  const assets = usePortfolioStore((s) => s.assets);
  const [exporting, setExporting] = useState<string | null>(null);

  // Calculate gains/losses for tax reporting
  const calculateGainLoss = (asset: Asset) => {
    const costBasis = asset.quantity * asset.purchasePrice;
    const currentValue = asset.quantity * asset.currentPrice;
    const gainLoss = currentValue - costBasis;
    const percentChange = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;
    
    // Determine if short-term or long-term (1 year threshold)
    const purchaseDate = new Date(asset.purchaseDate);
    const now = new Date();
    const holdingPeriodDays = Math.floor((now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
    const isLongTerm = holdingPeriodDays >= 365;
    
    return { costBasis, currentValue, gainLoss, percentChange, holdingPeriodDays, isLongTerm };
  };

  // Generate CSV content with tax-relevant columns
  const generateCSV = (): string => {
    const headers = [
      'Asset Name',
      'Ticker/Symbol',
      'Category',
      'Quantity',
      'Purchase Date',
      'Purchase Price',
      'Cost Basis',
      'Current Price',
      'Current Value',
      'Gain/Loss',
      'Gain/Loss %',
      'Holding Period (Days)',
      'Term (Short/Long)',
      'Account Type',
      'Country',
      'Platform/Broker',
      'Currency',
      'Notes',
    ];

    const rows = assets.map(asset => {
      const { costBasis, currentValue, gainLoss, percentChange, holdingPeriodDays, isLongTerm } = calculateGainLoss(asset);
      const countryInfo = asset.country && COUNTRY_INFO[asset.country as CountryCode];
      
      return [
        `"${asset.name.replace(/"/g, '""')}"`,
        asset.ticker || 'N/A',
        CATEGORY_INFO[asset.category]?.label || asset.category,
        asset.quantity.toString(),
        asset.purchaseDate,
        asset.purchasePrice.toFixed(2),
        costBasis.toFixed(2),
        asset.currentPrice.toFixed(2),
        currentValue.toFixed(2),
        gainLoss.toFixed(2),
        `${percentChange.toFixed(2)}%`,
        holdingPeriodDays.toString(),
        isLongTerm ? 'Long-term' : 'Short-term',
        asset.heldIn || 'Taxable',
        countryInfo ? countryInfo.name : (asset.country || 'N/A'),
        asset.platform || 'N/A',
        asset.currency,
        `"${(asset.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    // Add summary section
    const totalCostBasis = assets.reduce((sum, a) => sum + (a.quantity * a.purchasePrice), 0);
    const totalCurrentValue = assets.reduce((sum, a) => sum + (a.quantity * a.currentPrice), 0);
    const totalGainLoss = totalCurrentValue - totalCostBasis;
    
    const shortTermGains = assets
      .filter(a => !calculateGainLoss(a).isLongTerm)
      .reduce((sum, a) => sum + calculateGainLoss(a).gainLoss, 0);
    
    const longTermGains = assets
      .filter(a => calculateGainLoss(a).isLongTerm)
      .reduce((sum, a) => sum + calculateGainLoss(a).gainLoss, 0);

    const summary = [
      '',
      'TAX SUMMARY',
      `Report Generated,${new Date().toISOString()}`,
      `Total Assets,${assets.length}`,
      `Total Cost Basis,${totalCostBasis.toFixed(2)}`,
      `Total Current Value,${totalCurrentValue.toFixed(2)}`,
      `Total Unrealized Gain/Loss,${totalGainLoss.toFixed(2)}`,
      `Short-term Gains/Losses (< 1 year),${shortTermGains.toFixed(2)}`,
      `Long-term Gains/Losses (≥ 1 year),${longTermGains.toFixed(2)}`,
      '',
      'JURISDICTION NOTES',
      'USA: Short-term gains taxed as ordinary income. Long-term gains taxed at preferential rates (0%/15%/20%).',
      'Canada: 50% of capital gains are taxable. Track ACB (Adjusted Cost Base) for each security.',
      'UK: Capital Gains Tax applies above annual allowance. Different rates for basic/higher rate taxpayers.',
    ];

    return [headers.join(','), ...rows, ...summary].join('\n');
  };

  // Generate JSON content
  const generateJSON = (): string => {
    const exportData = {
      exportDate: new Date().toISOString(),
      totalAssets: assets.length,
      summary: {
        totalCostBasis: assets.reduce((sum, a) => sum + (a.quantity * a.purchasePrice), 0),
        totalCurrentValue: assets.reduce((sum, a) => sum + (a.quantity * a.currentPrice), 0),
        totalGainLoss: 0,
        shortTermGains: 0,
        longTermGains: 0,
      },
      assets: assets.map(asset => {
        const { costBasis, currentValue, gainLoss, percentChange, holdingPeriodDays, isLongTerm } = calculateGainLoss(asset);
        return {
          ...asset,
          taxInfo: {
            costBasis,
            currentValue,
            unrealizedGainLoss: gainLoss,
            percentChange,
            holdingPeriodDays,
            term: isLongTerm ? 'long-term' : 'short-term',
          },
        };
      }),
      jurisdictionNotes: {
        USA: 'Short-term gains (<1 year) taxed as ordinary income. Long-term gains taxed at preferential rates.',
        Canada: '50% of capital gains are taxable. Track ACB (Adjusted Cost Base) for each security.',
        UK: 'Capital Gains Tax applies above annual allowance. Different rates for basic/higher rate taxpayers.',
      },
    };

    // Calculate totals
    exportData.summary.totalGainLoss = exportData.summary.totalCurrentValue - exportData.summary.totalCostBasis;
    exportData.summary.shortTermGains = assets
      .filter(a => !calculateGainLoss(a).isLongTerm)
      .reduce((sum, a) => sum + calculateGainLoss(a).gainLoss, 0);
    exportData.summary.longTermGains = assets
      .filter(a => calculateGainLoss(a).isLongTerm)
      .reduce((sum, a) => sum + calculateGainLoss(a).gainLoss, 0);

    return JSON.stringify(exportData, null, 2);
  };

  // Generate PDF-style HTML content (will be shared as HTML, user can print to PDF)
  const generateHTMLReport = (): string => {
    const totalCostBasis = assets.reduce((sum, a) => sum + (a.quantity * a.purchasePrice), 0);
    const totalCurrentValue = assets.reduce((sum, a) => sum + (a.quantity * a.currentPrice), 0);
    const totalGainLoss = totalCurrentValue - totalCostBasis;
    
    const shortTermAssets = assets.filter(a => !calculateGainLoss(a).isLongTerm);
    const longTermAssets = assets.filter(a => calculateGainLoss(a).isLongTerm);
    const shortTermGains = shortTermAssets.reduce((sum, a) => sum + calculateGainLoss(a).gainLoss, 0);
    const longTermGains = longTermAssets.reduce((sum, a) => sum + calculateGainLoss(a).gainLoss, 0);

    const formatCurrency = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

    const assetRows = assets.map(asset => {
      const { costBasis, currentValue, gainLoss, isLongTerm } = calculateGainLoss(asset);
      const gainColor = gainLoss >= 0 ? '#10B981' : '#EF4444';
      return `
        <tr>
          <td>${asset.name}</td>
          <td>${asset.ticker || '-'}</td>
          <td>${asset.quantity}</td>
          <td>${formatCurrency(costBasis)}</td>
          <td>${formatCurrency(currentValue)}</td>
          <td style="color: ${gainColor}">${formatCurrency(gainLoss)}</td>
          <td>${isLongTerm ? 'Long' : 'Short'}</td>
          <td>${asset.heldIn || 'Taxable'}</td>
        </tr>
      `;
    }).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Portfolio Tax Report - ${new Date().toLocaleDateString()}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 1000px; margin: 0 auto; }
    h1 { color: #10B981; border-bottom: 2px solid #10B981; padding-bottom: 10px; }
    h2 { color: #374151; margin-top: 30px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
    .summary-card { background: #F3F4F6; padding: 15px; border-radius: 8px; }
    .summary-card .label { color: #6B7280; font-size: 12px; text-transform: uppercase; }
    .summary-card .value { font-size: 24px; font-weight: bold; margin-top: 5px; }
    .gain { color: #10B981; }
    .loss { color: #EF4444; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #E5E7EB; }
    th { background: #F9FAFB; font-weight: 600; color: #374151; }
    .tax-notes { background: #FEF3C7; padding: 15px; border-radius: 8px; margin-top: 30px; }
    .tax-notes h3 { color: #D97706; margin-top: 0; }
    .tax-notes ul { margin: 0; padding-left: 20px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB; color: #9CA3AF; font-size: 12px; }
    @media print { body { padding: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <h1>📊 Portfolio Tax Report</h1>
  <p>Generated: ${new Date().toLocaleString()} | Ledger App</p>
  
  <div class="summary">
    <div class="summary-card">
      <div class="label">Total Assets</div>
      <div class="value">${assets.length}</div>
    </div>
    <div class="summary-card">
      <div class="label">Total Cost Basis</div>
      <div class="value">${formatCurrency(totalCostBasis)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Current Value</div>
      <div class="value">${formatCurrency(totalCurrentValue)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Unrealized Gain/Loss</div>
      <div class="value ${totalGainLoss >= 0 ? 'gain' : 'loss'}">${formatCurrency(totalGainLoss)}</div>
    </div>
  </div>

  <h2>Tax Summary by Holding Period</h2>
  <div class="summary">
    <div class="summary-card">
      <div class="label">Short-term (< 1 year)</div>
      <div class="value ${shortTermGains >= 0 ? 'gain' : 'loss'}">${formatCurrency(shortTermGains)}</div>
      <div style="color: #6B7280; font-size: 12px; margin-top: 5px;">${shortTermAssets.length} positions</div>
    </div>
    <div class="summary-card">
      <div class="label">Long-term (≥ 1 year)</div>
      <div class="value ${longTermGains >= 0 ? 'gain' : 'loss'}">${formatCurrency(longTermGains)}</div>
      <div style="color: #6B7280; font-size: 12px; margin-top: 5px;">${longTermAssets.length} positions</div>
    </div>
  </div>

  <h2>Holdings Detail</h2>
  <table>
    <thead>
      <tr>
        <th>Asset</th>
        <th>Ticker</th>
        <th>Qty</th>
        <th>Cost Basis</th>
        <th>Current Value</th>
        <th>Gain/Loss</th>
        <th>Term</th>
        <th>Account</th>
      </tr>
    </thead>
    <tbody>
      ${assetRows}
    </tbody>
  </table>

  <div class="tax-notes">
    <h3>⚠️ Tax Jurisdiction Notes</h3>
    <ul>
      <li><strong>USA:</strong> Short-term gains (&lt;1 year) taxed as ordinary income. Long-term gains taxed at 0%, 15%, or 20% depending on income bracket. Report on Schedule D.</li>
      <li><strong>Canada:</strong> 50% of capital gains are taxable (inclusion rate). Track Adjusted Cost Base (ACB). Report on Schedule 3.</li>
      <li><strong>UK:</strong> Capital Gains Tax applies above annual exempt amount (£6,000 for 2024/25). 10%/20% rates for basic/higher taxpayers.</li>
    </ul>
    <p style="margin-top: 10px; font-size: 12px; color: #92400E;">
      <strong>Disclaimer:</strong> This report is for informational purposes only. Consult a qualified tax professional for advice specific to your situation.
    </p>
  </div>

  <div class="footer">
    <p>Generated by Ledger • Private Portfolio Tracker • ledger-app.com</p>
    <p>This document contains sensitive financial information. Handle securely.</p>
  </div>
</body>
</html>
    `;
  };

  const handleExport = async (format: string) => {
    if (!isPremium) {
      console.log('[Premium Debug] Premium feature blocked - Export Data:', {
        location: 'export-data-screen',
        requestedFormat: format,
        isPremium: false,
        timestamp: new Date().toISOString(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      router.push('/premium');
      return;
    }

    if (assets.length === 0) {
      Burnt.toast({
        title: 'No assets to export',
        preset: 'error',
      });
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setExporting(format);

    try {
      let content: string;
      let filename: string;
      let mimeType: string;

      const dateStr = new Date().toISOString().split('T')[0];

      switch (format) {
        case 'excel':
          content = generateCSV();
          filename = `ledger-tax-report-${dateStr}.csv`;
          mimeType = 'text/csv';
          break;
        case 'json':
          content = generateJSON();
          filename = `ledger-portfolio-${dateStr}.json`;
          mimeType = 'application/json';
          break;
        case 'pdf':
          content = generateHTMLReport();
          filename = `ledger-tax-report-${dateStr}.html`;
          mimeType = 'text/html';
          break;
        default:
          throw new Error('Unknown format');
      }

      // Write to file
      const fileUri = FileSystem.documentDirectory + filename;
      await FileSystem.writeAsStringAsync(fileUri, content);

      // Check if sharing is available
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType,
          dialogTitle: `Export ${format.toUpperCase()} Report`,
          UTI: format === 'pdf' ? 'public.html' : undefined,
        });

        Burnt.toast({
          title: 'Export ready',
          message: format === 'pdf' ? 'Open in browser & print to PDF' : undefined,
          preset: 'done',
        });
      } else {
        Burnt.toast({
          title: 'Sharing not available',
          preset: 'error',
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      Burnt.toast({
        title: 'Export failed',
        preset: 'error',
      });
    } finally {
      setExporting(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header */}
      <View
        style={{ paddingTop: insets.top, borderBottomColor: theme.border }}
        className="px-5 pb-4 border-b"
      >
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            style={{ backgroundColor: theme.surface }}
            className="w-10 h-10 rounded-full items-center justify-center mr-3"
          >
            <ArrowLeft size={20} color={theme.text} />
          </Pressable>
          <Text style={{ color: theme.text }} className="text-xl font-bold">Export Data</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingVertical: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Premium Banner */}
        {!isPremium && (
          <Animated.View entering={FadeInDown.delay(50)}>
            <Pressable
              onPress={() => {
                console.log('[Premium Debug] Upgrade button clicked:', {
                  location: 'export-data-banner',
                  isPremium: false,
                  timestamp: new Date().toISOString(),
                });
                router.push('/premium');
              }}
              className="mb-6"
            >
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: 16, padding: 16 }}
              >
                <View className="flex-row items-center">
                  <View className="w-12 h-12 bg-white/20 rounded-full items-center justify-center">
                    <Lock size={24} color="white" />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="text-white font-bold">Be ready for tax time</Text>
                    <Text className="text-white/80 text-sm">
                      Export CSV/PDF with Premium
                    </Text>
                  </View>
                  <Sparkles size={20} color="white" />
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}

        <Text style={{ color: theme.textSecondary }} className="text-sm mb-4">
          Export your portfolio data in your preferred format
        </Text>

        {/* Summary */}
        <Animated.View entering={FadeInDown.delay(100)} style={{ backgroundColor: theme.surfaceHover }} className="rounded-xl p-4 mb-6">
          <Text style={{ color: theme.textSecondary }} className="text-sm">Ready to export</Text>
          <Text style={{ color: theme.text }} className="text-2xl font-bold mt-1">
            {assets.length} {assets.length === 1 ? 'Asset' : 'Assets'}
          </Text>
        </Animated.View>

        {/* Export Formats */}
        {EXPORT_FORMATS.map((format, index) => {
          const Icon = format.icon;
          const isExporting = exporting === format.id;
          return (
            <Animated.View key={format.id} entering={FadeInDown.delay(150 + index * 50)}>
              <Pressable
                onPress={() => handleExport(format.id)}
                style={{ backgroundColor: theme.surfaceHover }}
                className="rounded-2xl p-4 mb-3"
                disabled={!isPremium || exporting !== null}
              >
                <View className="flex-row items-center" style={{ opacity: (!isPremium || (exporting && !isExporting)) ? 0.5 : 1 }}>
                  <View
                    className="w-14 h-14 rounded-xl items-center justify-center"
                    style={{ backgroundColor: `${format.color}20` }}
                  >
                    {isExporting ? (
                      <ActivityIndicator size="small" color={format.color} />
                    ) : (
                      <Icon size={28} color={format.color} />
                    )}
                  </View>
                  <View className="flex-1 ml-4">
                    <View className="flex-row items-center">
                      <Text style={{ color: theme.text }} className="font-semibold">{format.name}</Text>
                      {!isPremium && (
                        <View className="bg-amber-500/20 px-2 py-0.5 rounded ml-2">
                          <Text className="text-amber-500 text-[10px] font-medium">
                            PREMIUM
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ color: theme.textSecondary }} className="text-sm mt-1">
                      {format.description}
                    </Text>
                    <Text style={{ color: theme.textTertiary }} className="text-xs mt-1">
                      {format.extension}
                    </Text>
                  </View>
                  {isExporting ? (
                    <Check size={20} color="#10B981" />
                  ) : (
                    <Download size={20} color={theme.textSecondary} />
                  )}
                </View>
              </Pressable>
            </Animated.View>
          );
        })}

        {/* Info Box */}
        <Animated.View entering={FadeInDown.delay(350)} style={{ backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.08)' }} className="rounded-xl p-4 mt-4">
          <Text style={{ color: isDark ? '#A5B4FC' : '#4F46E5' }} className="text-sm leading-5">
            Exported data includes all asset details, purchase prices, current values, and transaction history.
          </Text>
        </Animated.View>

        {/* Tax Info */}
        <Animated.View entering={FadeInDown.delay(400)} style={{ backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.08)' }} className="rounded-xl p-4 mt-3">
          <Text style={{ color: isDark ? '#FCD34D' : '#D97706' }} className="text-sm leading-5 font-medium mb-1">
            📊 Tax-Ready Reports
          </Text>
          <Text style={{ color: isDark ? '#FCD34D' : '#D97706' }} className="text-xs leading-4 opacity-80">
            Reports include short/long-term classification and jurisdiction-specific notes for USA (Schedule D), Canada (Schedule 3), and UK (CGT).
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
