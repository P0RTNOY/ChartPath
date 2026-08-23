import type { ReactNode } from 'react';

import { Screen, type ScreenProps } from '@chartpath/ui';

import { BottomNav, navigationInset } from './bottom-nav';

export function MainScreen({
  children,
  contentContainerStyle,
  ...props
}: Omit<ScreenProps, 'children'> & { readonly children: ReactNode }) {
  return (
    <>
      <Screen
        {...props}
        contentContainerStyle={[{ paddingBottom: navigationInset + 24 }, contentContainerStyle]}
      >
        {children}
      </Screen>
      <BottomNav />
    </>
  );
}
