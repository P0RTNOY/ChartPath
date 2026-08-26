import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { randomUUID } from 'expo-crypto';
import * as Sharing from 'expo-sharing';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';

import { Badge, Button, Card, Heading, LtrText, UiText, useTheme } from '@chartpath/ui';

import type { RecoveryImportPlan } from '@/lib/persistence';
import {
  DEFAULT_RECOVERY_CATEGORIES,
  RECOVERY_CATEGORIES,
  decryptRecoveryBundle,
  expoRecoveryCryptoProvider,
  exportRecoveryBundle,
  type RecoveryBundleExportResultV1,
  type RecoveryCategory,
  type RecoveryPayloadCountsV1,
  type RecoveryPayloadV1,
  type SensitiveRecoveryCategory,
} from '@/lib/recovery';
import { useLearning } from '@/state/learning';

const categoryLabels: Readonly<Record<RecoveryCategory, string>> = {
  settings: 'העדפות תצוגה ולמידה',
  attempts: 'ניסיונות והתקדמות מחושבת',
  'analysis-sessions': 'טיוטות וסשני ניתוח',
  'paper-execution-sessions': 'תרגולי ביצוע על נייר',
  'position-management-sessions': 'ניהול פוזיציה וטקסט יומן',
  'quarantine-records': 'רשומות הסגר והמטען המקורי שלהן',
};

const sensitiveCategoryLabels: Readonly<Record<SensitiveRecoveryCategory, string>> = {
  'position-management-sessions': 'אני מאשר/ת לכלול טקסט יומן וניהול פוזיציה בקובץ המוצפן.',
  'quarantine-records': 'אני מאשר/ת לכלול מטעני הסגר מקוריים בקובץ המוצפן.',
};

function PasswordField({
  label,
  value,
  onChange,
  testID,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly testID: string;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <UiText variant="label">{label}</UiText>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onChange}
        placeholder="לפחות 15 תווים"
        placeholderTextColor={theme.colors.textMuted}
        secureTextEntry
        style={{
          borderColor: theme.colors.borderStrong,
          borderRadius: theme.radii.md,
          borderWidth: 1,
          color: theme.colors.text,
          direction: 'ltr',
          minHeight: 52,
          paddingHorizontal: theme.spacing.md,
          textAlign: 'left',
        }}
        testID={testID}
        value={value}
      />
      <UiText color="textMuted" variant="caption">
        הסיסמה אינה נשמרת ואינה ניתנת לשחזור. שמרו אותה בנפרד מהקובץ.
      </UiText>
    </View>
  );
}

function CountSummary({
  counts,
  prefix,
}: {
  readonly counts: RecoveryPayloadCountsV1;
  readonly prefix: string;
}) {
  const rows = [
    ['הגדרות', counts.settings],
    ['ניסיונות', counts.attempts],
    ['סשני ניתוח', counts.analysisSessions],
    ['סשני ביצוע', counts.paperExecutionSessions],
    ['סשני ניהול ויומן', counts.positionManagementSessions],
    ['רשומות הסגר', counts.quarantineRecords.total],
  ] as const;
  return (
    <View style={{ gap: 4 }}>
      {rows.map(([label, count]) => (
        <View
          key={label}
          style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}
        >
          <UiText color="textMuted" variant="caption">{`${prefix} ${label}:`}</UiText>
          <LtrText variant="numeric">{count}</LtrText>
        </View>
      ))}
    </View>
  );
}

function localizedRecoveryError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';
  if (code === 'RECOVERY_AUTHENTICATION_FAILED')
    return 'הסיסמה שגויה או שהקובץ שונה. לא בוצע יבוא.';
  if (code === 'RECOVERY_PASSPHRASE_INVALID') return 'נדרשת סיסמה באורך 15 תווים לפחות.';
  if (code === 'RECOVERY_SENSITIVE_CONSENT_REQUIRED')
    return 'נדרש אישור פרטיות מפורש לכל קטגוריה רגישה שנבחרה.';
  if (code.startsWith('RECOVERY_')) return 'קובץ השחזור אינו תקין או אינו נתמך. לא בוצע יבוא.';
  const name = error instanceof Error ? error.name : '';
  if (name === 'RecoveryImportStalePlanError')
    return 'הנתונים המקומיים השתנו אחרי הבדיקה. הפעילו בדיקה יבשה חדשה.';
  if (name === 'RecoveryImportConflictError')
    return 'היבוא מתנגש עם מידע מקומי בלתי־ניתן לשינוי. לא בוצעה כתיבה.';
  return 'פעולת השחזור נכשלה. הנתונים לא שונו.';
}

function passphraseReady(value: string): boolean {
  return value.normalize('NFC') === value && [...value].length >= 15;
}

function focusAccessibleTarget(target: View | null): void {
  if (!target) return;
  if (Platform.OS === 'web') {
    requestAnimationFrame(() =>
      (target as unknown as { readonly focus?: () => void }).focus?.(),
    );
    return;
  }
  const handle = findNodeHandle(target);
  if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
}

function webDownload(bundleText: string, fileName: string): void {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function')
    throw new Error('Browser download is unavailable.');
  const objectUrl = URL.createObjectURL(new Blob([bundleText], { type: 'application/json' }));
  try {
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function RecoveryBundlePanel() {
  const theme = useTheme();
  const learning = useLearning();
  const [categories, setCategories] = useState<ReadonlySet<RecoveryCategory>>(
    () => new Set(DEFAULT_RECOVERY_CATEGORIES),
  );
  const [consents, setConsents] = useState<ReadonlySet<SensitiveRecoveryCategory>>(
    () => new Set(),
  );
  const [exportPassword, setExportPassword] = useState('');
  const [exported, setExported] = useState<RecoveryBundleExportResultV1 | null>(null);
  const exportFileRef = useRef<File | null>(null);
  const [importPassword, setImportPassword] = useState('');
  const [pickedFile, setPickedFile] = useState<{ readonly name: string; readonly text: string } | null>(
    null,
  );
  const [importPayload, setImportPayload] = useState<RecoveryPayloadV1 | null>(null);
  const [importPlan, setImportPlan] = useState<RecoveryImportPlan | null>(null);
  const [confirmImport, setConfirmImport] = useState(false);
  const [working, setWorking] = useState<'export' | 'share' | 'preview' | 'apply' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);
  const importConfirmationRef = useRef<View>(null);
  const missingSensitiveConsents = useMemo(
    () =>
      (['position-management-sessions', 'quarantine-records'] as const).filter(
        (category) => categories.has(category) && !consents.has(category),
      ),
    [categories, consents],
  );

  useEffect(() => {
    if (!confirmImport) return;
    focusAccessibleTarget(importConfirmationRef.current);
  }, [confirmImport]);

  const toggleCategory = (category: RecoveryCategory) => {
    setCategories((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
    if (category === 'position-management-sessions' || category === 'quarantine-records') {
      setConsents((current) => {
        const next = new Set(current);
        next.delete(category);
        return next;
      });
    }
    setExported(null);
    exportFileRef.current = null;
  };

  const toggleConsent = (category: SensitiveRecoveryCategory) => {
    setConsents((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const createExport = async () => {
    if (!learning.snapshot) return;
    setWorking('export');
    setMessage(null);
    setMessageIsError(false);
    try {
      const result = await exportRecoveryBundle({
        snapshot: learning.snapshot,
        options: {
          appVersion: Constants.expoConfig?.version ?? '0.1.0',
          bundleId: `recovery-${randomUUID().toLowerCase()}`,
          createdAt: new Date().toISOString(),
          categories: RECOVERY_CATEGORIES.filter((category) => categories.has(category)),
          sensitiveCategoryConsents: (
            ['position-management-sessions', 'quarantine-records'] as const
          ).filter((category) => consents.has(category)),
        },
        passphrase: exportPassword,
        cryptoProvider: expoRecoveryCryptoProvider,
      });
      const fileName = `chartpath-recovery-${result.payload.bundleId}.json`;
      if (Platform.OS === 'web') {
        webDownload(result.bundleText, fileName);
        exportFileRef.current = null;
      } else {
        const file = new File(Paths.cache, fileName);
        file.create({ overwrite: true });
        file.write(result.bundleText);
        exportFileRef.current = file;
      }
      setExported(result);
      setMessage(
        Platform.OS === 'web'
          ? 'הקובץ המוצפן נוצר והורד דרך הדפדפן. ודאו שהוא נשמר לפני יציאה.'
          : 'הקובץ המוצפן נוצר מקומית. שתפו או שמרו אותו לפני יציאה מהמסך.',
      );
    } catch (error) {
      setExported(null);
      exportFileRef.current = null;
      setMessage(localizedRecoveryError(error));
      setMessageIsError(true);
    } finally {
      setWorking(null);
    }
  };

  const shareExport = async () => {
    if (!exported) return;
    setWorking('share');
    setMessage(null);
    setMessageIsError(false);
    try {
      if (Platform.OS === 'web') {
        webDownload(
          exported.bundleText,
          `chartpath-recovery-${exported.payload.bundleId}.json`,
        );
        setMessage('הורדה נוספת של הקובץ המוצפן הופעלה בדפדפן.');
        return;
      }
      const file = exportFileRef.current;
      if (!file) throw new Error('Recovery file is unavailable.');
      if (!(await Sharing.isAvailableAsync())) throw new Error('שיתוף קבצים אינו זמין במכשיר זה.');
      await Sharing.shareAsync(file.uri, {
        dialogTitle: 'שמירת קובץ שחזור מוצפן של ChartPath',
        mimeType: 'application/json',
        UTI: 'public.json',
      });
      setMessage('חלון השיתוף נסגר. ודאו שהקובץ נשמר במקום שבחרתם.');
    } catch (error) {
      setMessage(localizedRecoveryError(error));
      setMessageIsError(true);
    } finally {
      setWorking(null);
    }
  };

  const pickImportFile = async () => {
    setMessage(null);
    setMessageIsError(false);
    setImportPayload(null);
    setImportPlan(null);
    setConfirmImport(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'application/octet-stream', 'text/plain'],
        copyToCacheDirectory: true,
        multiple: false,
        base64: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) throw new Error('לא התקבל קובץ לבדיקת שחזור.');
      const text = asset.file ? await asset.file.text() : await new File(asset.uri).text();
      setPickedFile({ name: asset.name, text });
      setMessage('הקובץ נבחר. הזינו את הסיסמה והפעילו בדיקה יבשה לפני יבוא.');
    } catch (error) {
      setPickedFile(null);
      setMessage(localizedRecoveryError(error));
      setMessageIsError(true);
    }
  };

  const previewImport = async () => {
    if (!pickedFile) return;
    setWorking('preview');
    setMessage(null);
    setMessageIsError(false);
    setImportPayload(null);
    setImportPlan(null);
    setConfirmImport(false);
    try {
      const decrypted = await decryptRecoveryBundle(
        pickedFile.text,
        importPassword,
        expoRecoveryCryptoProvider,
      );
      const plan = await learning.previewRecoveryImport(decrypted.payload);
      setImportPayload(decrypted.payload);
      setImportPlan(plan);
      setMessage(
        plan.canApply
          ? 'הבדיקה היבשה הושלמה. דבר לא נכתב למאגר.'
          : 'נמצאו התנגשויות. היבוא חסום ודבר לא נכתב למאגר.',
      );
      setMessageIsError(!plan.canApply);
    } catch (error) {
      setMessage(localizedRecoveryError(error));
      setMessageIsError(true);
    } finally {
      setWorking(null);
    }
  };

  const toggleImportCategory = async (category: RecoveryCategory) => {
    if (!importPayload || !importPlan || working) return;
    const next = new Set(importPlan.selectedCategories);
    if (next.has(category)) next.delete(category);
    else next.add(category);
    const selectedCategories = RECOVERY_CATEGORIES.filter(
      (candidate) => next.has(candidate) && importPayload.includedCategories.includes(candidate),
    );
    if (!selectedCategories.length) {
      setMessage('יש לבחור לפחות קטגוריה אחת ליבוא. דבר לא נכתב למאגר.');
      setMessageIsError(true);
      return;
    }
    setWorking('preview');
    setMessage(null);
    setMessageIsError(false);
    setConfirmImport(false);
    setImportPlan(null);
    try {
      const plan = await learning.previewRecoveryImport(importPayload, { selectedCategories });
      setImportPlan(plan);
      setMessage(
        plan.canApply
          ? 'הבדיקה היבשה עודכנה לפי הקטגוריות שנבחרו. דבר לא נכתב למאגר.'
          : 'נמצאו התנגשויות בקטגוריות שנבחרו. היבוא חסום ודבר לא נכתב למאגר.',
      );
      setMessageIsError(!plan.canApply);
    } catch (error) {
      setMessage(localizedRecoveryError(error));
      setMessageIsError(true);
    } finally {
      setWorking(null);
    }
  };

  const applyImport = async () => {
    if (!importPayload || !importPlan) return;
    setWorking('apply');
    setMessage(null);
    setMessageIsError(false);
    try {
      const result = await learning.applyRecoveryImport(importPayload, {
        selectedCategories: importPlan.selectedCategories,
        expectedPlanToken: importPlan.planToken,
      });
      setMessage(
        result.applied
          ? 'היבוא הושלם. נוספו רק הרשומות שאושרו בתכנית; הרשומות המקומיות נשמרו.'
          : 'הקובץ אומת, אך לא היו רשומות חדשות להוספה.',
      );
      setConfirmImport(false);
      setImportPassword('');
      setImportPayload(null);
      setImportPlan(null);
    } catch (error) {
      setConfirmImport(false);
      setMessage(localizedRecoveryError(error));
      setMessageIsError(true);
    } finally {
      setWorking(null);
    }
  };

  return (
    <View style={{ gap: theme.spacing.xl }} testID="recovery-bundle-panel">
      <Card testID="recovery-export" variant="outlined">
        <View style={{ gap: theme.spacing.md }}>
          <Heading level={2}>יצירת קובץ שחזור מוצפן</Heading>
          <UiText>
            בחרו במפורש מה לכלול. תוכן QA פנימי וללא־קרדיט אינו מיוצא למסלול השחזור הרגיל.
          </UiText>
          <View accessibilityRole="list" style={{ gap: 8 }}>
            {RECOVERY_CATEGORIES.map((category) => {
              const checked = categories.has(category);
              return (
                <Pressable
                  accessibilityLabel={categoryLabels[category]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  aria-checked={checked}
                  key={category}
                  onPress={() => toggleCategory(category)}
                  style={{
                    borderColor: checked ? theme.colors.primary : theme.colors.borderStrong,
                    borderRadius: theme.radii.md,
                    borderWidth: checked ? 2 : 1,
                    minHeight: 48,
                    padding: theme.spacing.sm,
                  }}
                  testID={`recovery-export-category-${category}`}
                >
                  <UiText variant="bodySmall">{`${checked ? '☑' : '☐'} ${categoryLabels[category]}`}</UiText>
                </Pressable>
              );
            })}
          </View>
          {(['position-management-sessions', 'quarantine-records'] as const).map((category) =>
            categories.has(category) ? (
              <Pressable
                accessibilityLabel={sensitiveCategoryLabels[category]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: consents.has(category) }}
                aria-checked={consents.has(category)}
                key={category}
                onPress={() => toggleConsent(category)}
                style={{
                  backgroundColor: theme.colors.surfaceMuted,
                  borderRadius: theme.radii.md,
                  minHeight: 52,
                  padding: theme.spacing.sm,
                }}
                testID={`recovery-export-consent-${category}`}
              >
                <UiText color="warning" variant="bodySmall">
                  {`${consents.has(category) ? '☑' : '☐'} ${sensitiveCategoryLabels[category]}`}
                </UiText>
              </Pressable>
            ) : null,
          )}
          <PasswordField
            label="סיסמה חדשה לקובץ השחזור"
            onChange={(value) => {
              setExportPassword(value);
              setExported(null);
            }}
            testID="recovery-export-password"
            value={exportPassword}
          />
          <Button
            disabled={
              !categories.size ||
              !passphraseReady(exportPassword) ||
              missingSensitiveConsents.length > 0
            }
            fullWidth
            loading={working === 'export'}
            onPress={() => void createExport()}
            testID="recovery-export-create"
          >
            יצירת קובץ מוצפן
          </Button>
          {exported ? (
            <Card testID="recovery-export-summary" variant="subtle">
              <View style={{ gap: 8 }}>
                <Heading level={3}>סיכום הקובץ שנוצר</Heading>
                <CountSummary counts={exported.preview.counts} prefix="נכללו" />
                {exported.preview.privacy.containsPositionManagementAndJournalText ? (
                  <Badge tone="warning">כולל טקסט יומן וניהול פוזיציה</Badge>
                ) : undefined}
                {exported.preview.privacy.containsQuarantinePayloads ? (
                  <Badge tone="warning">כולל מטעני הסגר</Badge>
                ) : undefined}
                <LtrText
                  color="textMuted"
                  style={{ flexShrink: 1, width: '100%' }}
                  variant="caption"
                >
                  {exported.bundleDigest}
                </LtrText>
                <Button
                  fullWidth
                  loading={working === 'share'}
                  onPress={() => void shareExport()}
                  testID="recovery-export-share"
                  variant="secondary"
                >
                  {Platform.OS === 'web' ? 'הורדה נוספת של הקובץ' : 'שיתוף או שמירת הקובץ'}
                </Button>
              </View>
            </Card>
          ) : undefined}
        </View>
      </Card>

      <Card testID="recovery-import" variant="outlined">
        <View style={{ gap: theme.spacing.md }}>
          <Heading level={2}>בדיקה ויבוא מקובץ מוצפן</Heading>
          <UiText>
            היבוא הוא תוספתי בלבד. קודם תוצג בדיקה יבשה עם ספירות והתנגשויות; לא תתבצע כתיבה עד
            לאישור נפרד.
          </UiText>
          <Button fullWidth onPress={() => void pickImportFile()} testID="recovery-import-pick">
            בחירת קובץ שחזור
          </Button>
          {pickedFile ? (
            <LtrText
              color="textMuted"
              style={{ flexShrink: 1, width: '100%' }}
              testID="recovery-import-file"
            >
              {pickedFile.name}
            </LtrText>
          ) : undefined}
          <PasswordField
            label="סיסמת קובץ השחזור"
            onChange={setImportPassword}
            testID="recovery-import-password"
            value={importPassword}
          />
          <Button
            disabled={!pickedFile || !passphraseReady(importPassword)}
            fullWidth
            loading={working === 'preview'}
            onPress={() => void previewImport()}
            testID="recovery-import-preview"
            variant="secondary"
          >
            בדיקה יבשה — ללא כתיבה
          </Button>
          {importPlan ? (
            <Card testID="recovery-import-summary" variant="subtle">
              <View style={{ gap: 8 }}>
                <Heading level={3}>תכנית יבוא</Heading>
                <UiText variant="label">קטגוריות ליבוא בפועל</UiText>
                <UiText color="textMuted" variant="caption">
                  העדפות כבויות כברירת מחדל כאשר קיימים נתוני לומד במכשיר. כל שינוי מריץ מחדש
                  בדיקה יבשה ונקשר לאסימון האישור.
                </UiText>
                <View style={{ gap: 8 }} testID="recovery-import-categories">
                  {importPayload?.includedCategories.map((category) => {
                    const checked = importPlan.selectedCategories.includes(category);
                    const onlySelected = checked && importPlan.selectedCategories.length === 1;
                    return (
                      <Pressable
                        accessibilityLabel={`יבוא ${categoryLabels[category]}`}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked, disabled: onlySelected || Boolean(working) }}
                        aria-checked={checked}
                        disabled={onlySelected || Boolean(working)}
                        key={category}
                        onPress={() => void toggleImportCategory(category)}
                        style={{
                          borderColor: checked ? theme.colors.primary : theme.colors.borderStrong,
                          borderRadius: theme.radii.md,
                          borderWidth: checked ? 2 : 1,
                          minHeight: 48,
                          opacity: onlySelected ? 0.62 : 1,
                          padding: theme.spacing.sm,
                        }}
                        testID={`recovery-import-category-${category}`}
                      >
                        <UiText variant="bodySmall">
                          {`${checked ? '☑' : '☐'} ${categoryLabels[category]}`}
                        </UiText>
                      </Pressable>
                    );
                  })}
                </View>
                {importPayload?.privacy.containsPositionManagementAndJournalText ? (
                  <Badge tone="warning">הקובץ כולל טקסט יומן; ייובא רק אם הקטגוריה מסומנת</Badge>
                ) : undefined}
                {importPayload?.privacy.containsQuarantinePayloads ? (
                  <Badge tone="warning">הקובץ כולל מטעני הסגר; ייובאו רק אם הקטגוריה מסומנת</Badge>
                ) : undefined}
                <CountSummary counts={importPlan.incoming} prefix="בקובץ" />
                <CountSummary counts={importPlan.added} prefix="חדשות" />
                <CountSummary counts={importPlan.unchanged} prefix="ללא שינוי" />
                <Badge tone={importPlan.canApply ? 'success' : 'warning'}>
                  {importPlan.canApply
                    ? 'אין התנגשויות חוסמות'
                    : `${importPlan.conflicts.length} התנגשויות חוסמות`}
                </Badge>
                {importPlan.conflicts.map((conflict, index) => (
                  <View key={`${conflict.category}:${conflict.stableId}:${conflict.code}`}>
                    <LtrText
                      color="danger"
                      style={{ flexShrink: 1, width: '100%' }}
                      variant="caption"
                    >
                      {`${index + 1}. ${conflict.category} · ${conflict.code} · ${conflict.stableId}`}
                    </LtrText>
                    <LtrText
                      color="danger"
                      style={{ flexShrink: 1, width: '100%' }}
                      variant="caption"
                    >
                      {conflict.message}
                    </LtrText>
                  </View>
                ))}
                {importPlan.canApply && importPlan.hasChanges && !confirmImport ? (
                  <Button
                    fullWidth
                    onPress={() => setConfirmImport(true)}
                    testID="recovery-import-request-confirm"
                    variant="danger"
                  >
                    מעבר לאישור היבוא
                  </Button>
                ) : undefined}
              </View>
            </Card>
          ) : undefined}
          {confirmImport && importPlan ? (
            <Card testID="recovery-import-confirmation" variant="accent">
              <View style={{ gap: theme.spacing.md }}>
                <View
                  accessibilityLabel="אישור יבוא תוספתי. מידע מקומי קיים לא יימחק ולא יוחלף."
                  accessibilityRole={Platform.OS === 'web' ? undefined : 'header'}
                  accessible={Platform.OS !== 'web'}
                  ref={importConfirmationRef}
                  tabIndex={-1}
                >
                  <Heading level={2}>אישור יבוא תוספתי</Heading>
                </View>
                <UiText accessibilityLiveRegion="assertive">
                  יתווספו רק הרשומות המפורטות בתכנית. מידע מקומי קיים לא יימחק ולא יוחלף.
                </UiText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Button
                    loading={working === 'apply'}
                    onPress={() => void applyImport()}
                    testID="recovery-import-apply"
                    variant="danger"
                  >
                    אישור ויבוא
                  </Button>
                  <Button
                    disabled={working === 'apply'}
                    onPress={() => setConfirmImport(false)}
                    variant="ghost"
                  >
                    ביטול
                  </Button>
                </View>
              </View>
            </Card>
          ) : undefined}
        </View>
      </Card>

      {message ? (
        <UiText
          accessibilityLiveRegion={messageIsError ? 'assertive' : 'polite'}
          accessibilityRole={messageIsError ? 'alert' : undefined}
          color={messageIsError ? 'danger' : 'text'}
          testID="recovery-bundle-message"
        >
          {message}
        </UiText>
      ) : undefined}
    </View>
  );
}
