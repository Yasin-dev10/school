import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/teacher_provider.dart';
import '../utils/app_colors.dart';
import '../widgets/app_card.dart';
import '../widgets/app_loader.dart';
import '../widgets/empty_state.dart';
import 'package:flutter_zoom_drawer/flutter_zoom_drawer.dart';

class PayslipsScreen extends StatefulWidget {
  const PayslipsScreen({super.key});

  @override
  State<PayslipsScreen> createState() => _PayslipsScreenState();
}

class _PayslipsScreenState extends State<PayslipsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<TeacherProvider>(context, listen: false).fetchMyPayslips();
    });
  }

  @override
  Widget build(BuildContext context) {
    final teacher = Provider.of<TeacherProvider>(context);

    return Scaffold(
      appBar: AppBar(
        leading: Builder(
          builder: (context) => IconButton(
            icon: const Icon(Icons.menu_rounded),
            onPressed: () {
              final drawer = ZoomDrawer.of(context);
              if (drawer != null) {
                drawer.toggle();
              } else {
                Navigator.of(context).maybePop();
              }
            },
          ),
        ),
        title: const Text(
          'My Payslips',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
        ),
        backgroundColor: const Color(0xFF405BB2),
        foregroundColor: Colors.white,
      ),
      body: teacher.isLoading && teacher.payslips.isEmpty
          ? const AppLoader(message: 'Loading payslips…')
          : RefreshIndicator(
              color: AppColors.primary,
              onRefresh: () => teacher.fetchMyPayslips(),
              child: teacher.payslips.isEmpty
                  ? ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      children: const [
                        SizedBox(height: 80),
                        EmptyState(
                          icon: Icons.receipt_long_outlined,
                          title: 'No payslips yet',
                          subtitle:
                              'Your monthly payslips will appear here once processed.',
                        ),
                      ],
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
                      itemCount: teacher.payslips.length,
                      itemBuilder: (context, index) {
                        final slip = teacher.payslips[index];
                        return _buildPayslipCard(context, slip);
                      },
                    ),
            ),
    );
  }

  Widget _buildPayslipCard(BuildContext context, dynamic slip) {
    final month = slip['month'] ?? '';
    final year = slip['year'] ?? '';
    final num netSalary = slip['netSalary'] ?? 0;
    final num basicSalary = slip['basicSalary'] ?? 0;
    final status = slip['status'] ?? 'pending';
    final dateRow = slip['createdAt'] != null
        ? DateTime.parse(slip['createdAt'])
        : DateTime.now();
    final currency = NumberFormat.currency(symbol: '\$', decimalDigits: 0);

    return AppCard(
      margin: const EdgeInsets.only(bottom: 16),
      padding: EdgeInsets.zero,
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          tilePadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
          childrenPadding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
          title: Text(
            '$month $year',
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17),
          ),
          subtitle: Text(
            'Processed on ${DateFormat('MMM dd, yyyy').format(dateRow)}',
            style: TextStyle(color: AppColors.mutedText(context), fontSize: 12),
          ),
          trailing: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                currency.format(netSalary),
                style: const TextStyle(
                  color: AppColors.success,
                  fontWeight: FontWeight.w800,
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.softFill(
                    context,
                    status == 'paid' ? AppColors.success : AppColors.warning,
                  ),
                  borderRadius: BorderRadius.circular(AppRadii.full),
                ),
                child: Text(
                  status.toString().toUpperCase(),
                  style: TextStyle(
                    color: status == 'paid'
                        ? AppColors.success
                        : AppColors.warning,
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
          children: [
            _row(context, 'Basic salary', currency.format(basicSalary)),
            _row(
              context,
              'Allowances',
              currency.format(slip['allowances'] ?? 0),
            ),
            _row(
              context,
              'Deductions',
              currency.format(slip['deductions'] ?? 0),
            ),
            const Divider(height: 20),
            _row(context, 'Net salary', currency.format(netSalary), bold: true),
          ],
        ),
      ),
    );
  }

  Widget _row(
    BuildContext context,
    String label,
    String value, {
    bool bold = false,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              color: bold ? null : AppColors.mutedText(context),
              fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
              color: bold ? AppColors.success : null,
            ),
          ),
        ],
      ),
    );
  }
}
