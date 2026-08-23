import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html dir="rtl" lang="he">
      <head>
        <meta charSet="utf-8" />
        <meta content="width=device-width, initial-scale=1, maximum-scale=5" name="viewport" />
        <meta content="#006C67" name="theme-color" />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{ __html: 'body{background:#F3F7FA} *{box-sizing:border-box}' }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
