import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/theme_provider.dart';
import '../../utils/app_colors.dart';

class ThemeSettingsScreen extends StatelessWidget {
  const ThemeSettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Theme Settings'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Consumer<ThemeProvider>(
        builder: (context, themeProvider, child) {
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Current theme info
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            themeProvider.currentThemeIcon,
                            color: Theme.of(context).colorScheme.primary,
                            size: 24,
                          ),
                          const SizedBox(width: 12),
                          Text(
                            'Current Theme',
                            style: Theme.of(context).textTheme.titleMedium
                                ?.copyWith(fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        themeProvider.currentThemeDisplayName,
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: Theme.of(context).colorScheme.primary,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // Theme options
              Text(
                'Choose Theme',
                style: Theme.of(
                  context,
                ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
              ),

              const SizedBox(height: 16),

              // Theme mode options
              ...AppThemeMode.values.map((mode) {
                final isSelected = themeProvider.themeMode == mode;

                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: Icon(
                      themeProvider.getThemeModeIcon(mode),
                      color: isSelected
                          ? Theme.of(context).colorScheme.primary
                          : Theme.of(
                              context,
                            ).colorScheme.onSurface.withValues(alpha: 0.6),
                    ),
                    title: Text(
                      themeProvider.getThemeModeDisplayName(mode),
                      style: TextStyle(
                        fontWeight: isSelected
                            ? FontWeight.w600
                            : FontWeight.w400,
                        color: isSelected
                            ? Theme.of(context).colorScheme.primary
                            : null,
                      ),
                    ),
                    subtitle: Text(_getThemeDescription(mode)),
                    trailing: isSelected
                        ? Icon(
                            Icons.check_circle,
                            color: Theme.of(context).colorScheme.primary,
                          )
                        : null,
                    onTap: () => themeProvider.setThemeMode(mode),
                  ),
                );
              }),

              const SizedBox(height: 32),

              // Theme preview
              Text(
                'Preview',
                style: Theme.of(
                  context,
                ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
              ),

              const SizedBox(height: 16),

              // Color palette preview
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Color Palette',
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Primary colors
                      Row(
                        children: [
                          _ColorCircle(
                            color: Theme.of(context).colorScheme.primary,
                            label: 'Primary',
                          ),
                          const SizedBox(width: 16),
                          _ColorCircle(
                            color: Theme.of(context).colorScheme.secondary,
                            label: 'Secondary',
                          ),
                          const SizedBox(width: 16),
                          _ColorCircle(
                            color: AppColors.success,
                            label: 'Success',
                          ),
                          const SizedBox(width: 16),
                          _ColorCircle(color: AppColors.error, label: 'Error'),
                        ],
                      ),

                      const SizedBox(height: 16),

                      // Sample UI elements
                      ElevatedButton(
                        onPressed: () {},
                        child: const Text('Sample Button'),
                      ),

                      const SizedBox(height: 8),

                      TextField(
                        decoration: const InputDecoration(
                          labelText: 'Sample Input',
                          hintText: 'Enter text here',
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  String _getThemeDescription(AppThemeMode mode) {
    switch (mode) {
      case AppThemeMode.light:
        return 'Always use light theme';
      case AppThemeMode.dark:
        return 'Always use dark theme';
      case AppThemeMode.system:
        return 'Follow system settings';
    }
  }
}

class _ColorCircle extends StatelessWidget {
  final Color color;
  final String label;

  const _ColorCircle({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            border: Border.all(
              color: Theme.of(
                context,
              ).colorScheme.outline.withValues(alpha: 0.2),
              width: 1,
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(label, style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}
