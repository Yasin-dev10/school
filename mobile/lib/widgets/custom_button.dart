import 'package:flutter/material.dart';
import '../utils/app_colors.dart';

enum CustomButtonVariant { primary, secondary, outline, danger }

class CustomButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool isLoading;
  final bool expanded;
  final CustomButtonVariant variant;

  const CustomButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.isLoading = false,
    this.expanded = true,
    this.variant = CustomButtonVariant.primary,
  });

  @override
  Widget build(BuildContext context) {
    final child = isLoading
        ? SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(
              strokeWidth: 2.5,
              color: variant == CustomButtonVariant.outline
                  ? Theme.of(context).colorScheme.primary
                  : Colors.white,
            ),
          )
        : Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 20),
                const SizedBox(width: AppSpacing.sm),
              ],
              Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
            ],
          );

    final button = switch (variant) {
      CustomButtonVariant.primary => FilledButton(
          onPressed: isLoading ? null : onPressed,
          child: child,
        ),
      CustomButtonVariant.secondary => FilledButton.tonal(
          onPressed: isLoading ? null : onPressed,
          child: child,
        ),
      CustomButtonVariant.outline => OutlinedButton(
          onPressed: isLoading ? null : onPressed,
          child: child,
        ),
      CustomButtonVariant.danger => FilledButton(
          onPressed: isLoading ? null : onPressed,
          style: FilledButton.styleFrom(
            backgroundColor: AppColors.danger,
            foregroundColor: Colors.white,
          ),
          child: child,
        ),
    };

    if (!expanded) return button;
    return SizedBox(width: double.infinity, height: 56, child: button);
  }
}
