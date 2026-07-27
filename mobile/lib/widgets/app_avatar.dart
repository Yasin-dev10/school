import 'package:flutter/material.dart';
import '../utils/app_colors.dart';

class AppAvatar extends StatelessWidget {
  final String? firstName;
  final String? lastName;
  final double radius;
  final Color? backgroundColor;
  final Color? foregroundColor;

  const AppAvatar({
    super.key,
    this.firstName,
    this.lastName,
    this.radius = 28,
    this.backgroundColor,
    this.foregroundColor,
  });

  String get _initials {
    final f = (firstName?.isNotEmpty == true) ? firstName![0] : '';
    final l = (lastName?.isNotEmpty == true) ? lastName![0] : '';
    final result = '$f$l'.toUpperCase();
    return result.isEmpty ? '?' : result;
  }

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    return CircleAvatar(
      radius: radius,
      backgroundColor: backgroundColor ?? AppColors.softFill(context, primary),
      child: Text(
        _initials,
        style: TextStyle(
          color: foregroundColor ?? primary,
          fontWeight: FontWeight.w800,
          fontSize: radius * 0.55,
        ),
      ),
    );
  }
}
