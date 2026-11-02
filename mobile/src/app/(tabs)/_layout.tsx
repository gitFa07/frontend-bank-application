import { NativeTabs } from 'expo-router/native-tabs';
import { useTheme } from '@/context/theme';

/** Native Material 3 bottom navigation (kit: "Navigation Bar"). */
export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <NativeTabs backgroundColor={colors.nav} indicatorColor={colors.tonal} labelStyle={{ selected: { color: colors.ink } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon md="home" />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="money">
        <NativeTabs.Trigger.Icon md="currency_rupee" />
        <NativeTabs.Trigger.Label>Money</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="you">
        <NativeTabs.Trigger.Icon md="person" />
        <NativeTabs.Trigger.Label>You</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
