import 'package:flutter/material.dart';
import '../utils/app_colors.dart';

/// Theme-aware surface card used across dashboards and lists.
class AppCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final VoidCallback? onTap;
  final double borderRadius;
  final Color? color;
  final bool elevated;

  const AppCard({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.onTap,
    this.borderRadius = AppRadii.xxl,
    this.color,
    this.elevated = true,
  });

  @override
  Widget build(BuildContext context) {
    final decoration = BoxDecoration(
      color: color ?? AppColors.card(context),
      borderRadius: BorderRadius.circular(borderRadius),
      border: Border.all(color: AppColors.cardBorder(context)),
      boxShadow: elevated ? AppColors.cardShadow(context) : null,
    );

    final content = Padding(
      padding: padding ?? const EdgeInsets.all(AppSpacing.lg),
      child: child,
    );

    return Container(
      margin: margin,
      decoration: decoration,
      child: Material(
        color: Colors.transparent,
        child: onTap != null
            ? InkWell(
                onTap: onTap,
                borderRadius: BorderRadius.circular(borderRadius),
                child: content,
              )
            : content,
      ),
    );
  }
}
