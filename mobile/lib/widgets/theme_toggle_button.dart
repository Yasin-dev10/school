import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/theme_provider.dart';

/// A button widget for toggling between light and dark themes
class ThemeToggleButton extends StatelessWidget {
  final bool showLabel;
  final EdgeInsetsGeometry? padding;

  const ThemeToggleButton({super.key, this.showLabel = false, this.padding});

  @override
  Widget build(BuildContext context) {
    return Consumer<ThemeProvider>(
      builder: (context, themeProvider, child) {
        return InkWell(
          onTap: () => themeProvider.toggleTheme(),
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: padding ?? const EdgeInsets.all(8),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              color: Theme.of(context).colorScheme.surface,
              border: Border.all(
                color: Theme.of(
                  context,
                ).colorScheme.outline.withValues(alpha: 0.2),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  themeProvider.currentThemeIcon,
                  color: Theme.of(context).colorScheme.primary,
                  size: 20,
                ),
                if (showLabel) ...[
                  const SizedBox(width: 8),
                  Text(
                    themeProvider.currentThemeDisplayName,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context).colorScheme.primary,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}

/// A floating action button for theme toggle
class ThemeToggleFAB extends StatelessWidget {
  const ThemeToggleFAB({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<ThemeProvider>(
      builder: (context, themeProvider, child) {
        return FloatingActionButton.small(
          onPressed: () => themeProvider.toggleTheme(),
          tooltip: 'Toggle Theme',
          child: Icon(themeProvider.currentThemeIcon),
        );
      },
    );
  }
}

/// A list tile for theme settings
class ThemeSettingsTile extends StatelessWidget {
  final VoidCallback? onTap;

  const ThemeSettingsTile({super.key, this.onTap});

  @override
  Widget build(BuildContext context) {
    return Consumer<ThemeProvider>(
      builder: (context, themeProvider, child) {
        return ListTile(
          leading: Icon(
            themeProvider.currentThemeIcon,
            color: Theme.of(context).colorScheme.primary,
          ),
          title: const Text('Theme'),
          subtitle: Text(themeProvider.currentThemeDisplayName),
          trailing: const Icon(Icons.chevron_right),
          onTap: onTap,
        );
      },
    );
  }
}