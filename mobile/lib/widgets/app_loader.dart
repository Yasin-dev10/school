import 'package:flutter/material.dart';
import '../utils/app_colors.dart';

class AppLoader extends StatelessWidget {
  final String? message;
  final double size;

  const AppLoader({super.key, this.message, this.size = 36});

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;

    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: size,
            height: size,
            child: CircularProgressIndicator(
              strokeWidth: 3,
              color: primary,
            ),
          ),
          if (message != null) ...[
            const SizedBox(height: AppSpacing.lg),
            Text(
              message!,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppColors.mutedText(context),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
