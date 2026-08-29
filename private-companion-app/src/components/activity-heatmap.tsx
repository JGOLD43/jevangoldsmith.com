import { memo, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { dateKey } from '@/domain/activity';
import type { DailyActivity } from '@/domain/models';
import { Fonts, type AppColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type HeatmapDay = DailyActivity & { future: boolean };
const WEEKDAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

export function buildHeatmapWeeks(activity: DailyActivity[], weekCount = 52, today = new Date()): HeatmapDay[][] {
  const activityByDate = new Map(activity.map((entry) => [entry.date, entry]));
  const endWeek = new Date(today);
  endWeek.setHours(12, 0, 0, 0);
  endWeek.setDate(endWeek.getDate() - endWeek.getDay());
  const start = new Date(endWeek);
  start.setDate(start.getDate() - ((weekCount - 1) * 7));
  const todayKey = dateKey(today);
  return Array.from({ length: weekCount }, (_, weekIndex) => Array.from({ length: 7 }, (_, dayIndex) => {
    const date = new Date(start);
    date.setDate(start.getDate() + (weekIndex * 7) + dayIndex);
    const key = dateKey(date);
    return { date: key, value: activityByDate.get(key)?.value ?? 0, count: activityByDate.get(key)?.count ?? 0, future: key > todayKey };
  }));
}

export const ActivityHeatmap = memo(function ActivityHeatmap({ activity, formatValue, weeks = 52 }: {
  activity: DailyActivity[];
  formatValue: (value: number, count: number) => string;
  weeks?: number;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const columns = useMemo(() => buildHeatmapWeeks(activity, weeks), [activity, weeks]);
  const maxValue = useMemo(() => Math.max(1, ...activity.map((entry) => entry.value)), [activity]);
  const scrollRef = useRef<ScrollView>(null);
  const didInitialScroll = useRef(false);
  const levels = useMemo(() => [colors.backgroundSelected, `${colors.accent}40`, `${colors.accent}70`, `${colors.accent}A8`, colors.accent], [colors]);

  const colorFor = (day: HeatmapDay) => {
    if (day.future) return 'transparent';
    if (day.value <= 0) return levels[0];
    return levels[Math.max(1, Math.min(4, Math.ceil((day.value / maxValue) * 4)) )];
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.chart}>
        <View style={styles.dayLabels}>
          <View style={styles.monthLabelSpacer} />
          <View style={styles.dayLabelRows}>
            {WEEKDAY_LABELS.map((label, index) => (
              <View key={index} style={styles.dayLabelSlot}>
                {label ? <Text style={styles.dayLabel}>{label}</Text> : null}
              </View>
            ))}
          </View>
        </View>
        <ScrollView
          ref={scrollRef}
          horizontal
          style={styles.timeline}
          showsHorizontalScrollIndicator={false}
          onContentSizeChange={() => {
            if (didInitialScroll.current) return;
            didInitialScroll.current = true;
            scrollRef.current?.scrollToEnd({ animated: false });
          }}>
          <View>
            <View style={styles.months}>
              {columns.map((week, index) => {
                const firstOfMonth = week.find((day) => day.date.endsWith('-01'));
                const date = new Date(`${(firstOfMonth ?? week[0]).date}T12:00:00`);
                const label = index === 0 || firstOfMonth ? date.toLocaleDateString(undefined, { month: 'short' }) : '';
                return <View key={week[0].date} style={styles.monthSlot}>{label ? <Text numberOfLines={1} style={styles.month}>{label}</Text> : null}</View>;
              })}
            </View>
            <View style={styles.weeks}>
              {columns.map((week) => (
                <View key={week[0].date} style={styles.week}>
                  {week.map((day) => (
                    <View
                      key={day.date}
                      accessibilityLabel={`${day.date}: ${formatValue(day.value, day.count)}`}
                      accessible={!day.future}
                      style={[styles.cell, { backgroundColor: colorFor(day) }]}
                    />
                  ))}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
      <View style={styles.legend}><Text style={styles.legendText}>Less</Text>{levels.map((color) => <View key={color} style={[styles.legendCell, { backgroundColor: color }]} />)}<Text style={styles.legendText}>More</Text></View>
    </View>
  );
});

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    wrapper: { position: 'relative', paddingBottom: 26 },
    chart: { flexDirection: 'row' },
    dayLabels: { width: 30, flexShrink: 0 },
    monthLabelSpacer: { height: 20 },
    dayLabelRows: { gap: 3 },
    dayLabelSlot: { height: 12, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 6 },
    dayLabel: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 8 },
    timeline: { flex: 1 },
    months: { height: 20, flexDirection: 'row', gap: 3 },
    monthSlot: { width: 12, height: 20, overflow: 'visible' },
    month: { position: 'absolute', width: 40, color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 8 },
    weeks: { flexDirection: 'row', gap: 3 },
    week: { gap: 3 },
    cell: { width: 12, height: 12, borderRadius: 2 },
    legend: { position: 'absolute', right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendText: { color: colors.textSecondary, fontFamily: Fonts.sans, fontSize: 9 },
    legendCell: { width: 10, height: 10, borderRadius: 2 },
  });
}
