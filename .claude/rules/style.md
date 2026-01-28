---
paths:
  - "apps/web/**/*.tsx"
  - "apps/mobile/**/*.tsx"
  - "**/*.css"
---
# Design System & Styling Rules

## Typography
- **Poppins Font**: ALWAYS use the "Poppins" font family for all user-facing text components (web and mobile).
- **Web**: Enforce `font-family: 'Poppins', sans-serif;` in Tailwind config or CSS.
- **Mobile**: Ensure the `Poppins` font is loaded via `expo-font` and used in `StyleSheet` objects.

## Styling Frameworks
- **Web**: Use Tailwind CSS utility classes exclusively.
- **Mobile**: Use standard React Native `StyleSheet.create()`. **DO NOT use NativeWind** as per project configuration.

## Confirmation Dialogs & Alerts
- **NEVER** use default OS confirmation dialogs (`Alert.alert()` on mobile, `window.confirm()` on web)
- **ALWAYS** use styled confirmation dialogs that match the app theme
- **Mobile**: Use custom styled Modal components (e.g., `DeleteWorkoutDialog` from `apps/mobile/components/ui/DeleteWorkoutDialog.tsx`)
  - Reference example: `apps/mobile/components/ui/DeleteWorkoutDialog.tsx` for the pattern
  - Use Modal with transparent overlay, styled container, and themed buttons
  - Follow the same design pattern for all confirmation dialogs
  - Use theme colors from `apps/mobile/constants/Theme.ts` (Colors, Spacing, BorderRadius)
  - Use typography from `apps/mobile/constants/Typography.ts` (TextStyles)
- **Web**: Use Shadcn/UI AlertDialog components from `apps/web/src/components/ui/alert-dialog.tsx`
  - Reference example: `apps/web/src/components/manage-t-paths/edit-workout-exercises/confirm-reset-dialog.tsx` for the pattern
  - Use AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter
  - Use AlertDialogCancel and AlertDialogAction for buttons
  - Destructive actions should use `variant="destructive"` on AlertDialogAction
- **Why**: Default OS dialogs don't match the app theme and provide inconsistent UX. Styled dialogs maintain design consistency and better user experience.
