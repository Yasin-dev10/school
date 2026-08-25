import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/student_provider.dart';
import '../../providers/auth_provider.dart';
import 'package:intl/intl.dart';
import 'package:flutter_zoom_drawer/flutter_zoom_drawer.dart';

class StudentFeesScreen extends StatefulWidget {
  const StudentFeesScreen({super.key});

  @override
  State<StudentFeesScreen> createState() => _StudentFeesScreenState();
}

class _StudentFeesScreenState extends State<StudentFeesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final studentId = auth.user?['_id'] ?? auth.user?['id'];
      if (studentId != null) {
        Provider.of<StudentProvider>(
          context,
          listen: false,
        ).fetchFees(studentId.toString());
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final studentProvider = Provider.of<StudentProvider>(context);
    final fees = studentProvider.fees;
    final isLoading = studentProvider.isLoading;

    double totalPending = 0;
    for (var fee in fees) {
      if (fee['status'] != 'paid') {
        totalPending += (fee['totalAmount'] ?? 0) - (fee['paidAmount'] ?? 0);
      }
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        leading: Builder(
          builder: (context) => IconButton(
            icon: const Icon(Icons.menu, color: Colors.white),
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
          'Finance',
          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
        ),
        elevation: 0,
        backgroundColor: const Color(0xFF405BB2),
        centerTitle: true,
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          final auth = Provider.of<AuthProvider>(context, listen: false);
          final studentId = auth.user?['_id'] ?? auth.user?['id'];
          await studentProvider.fetchFees(studentId?.toString());
        },
        child: isLoading && fees.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: const Color(0xFF405BB2),
                        borderRadius: BorderRadius.circular(24),
                      ),
                      child: const Row(
                        children: [
                          DecoratedBox(
                            decoration: BoxDecoration(
                              color: Color(0xFF6078C7),
                              borderRadius: BorderRadius.all(
                                Radius.circular(16),
                              ),
                            ),
                            child: Padding(
                              padding: EdgeInsets.all(14),
                              child: Icon(
                                Icons.account_balance_wallet,
                                color: Colors.white,
                              ),
                            ),
                          ),
                          SizedBox(width: 16),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Finance Information',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 19,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Text(
                                'Manage your financial records',
                                style: TextStyle(
                                  color: Colors.white70,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 28),
                    _buildSummaryCard(totalPending),
                    const SizedBox(height: 32),
                    const Text(
                      'Payment History',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    if (fees.isEmpty)
                      const Center(
                        child: Padding(
                          padding: EdgeInsets.only(top: 40),
                          child: Text(
                            'No fee records found',
                            style: TextStyle(color: Colors.grey),
                          ),
                        ),
                      )
                    else
                      ...fees.map((fee) => _buildFeeItem(fee)),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildSummaryCard(double pending) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: const Color(0xFFE2E8F0)),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'TOTAL PENDING',
            style: TextStyle(
              color: Colors.black54,
              fontSize: 12,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '\$${pending.toStringAsFixed(2)}',
            style: const TextStyle(
              color: Color(0xFF405BB2),
              fontSize: 36,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFFF0F7EB),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Text(
              'Academic Year 2025-26',
              style: TextStyle(
                color: Color(0xFF4C9A24),
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFeeItem(dynamic fee) {
    final status = fee['status'] ?? 'unpaid';
    final isPaid = status == 'paid';
    final amount = fee['totalAmount'] ?? 0;
    final date = fee['dueDate'] != null
        ? DateTime.parse(fee['dueDate'])
        : DateTime.now();

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: (isPaid ? Colors.green : Colors.orange).withValues(
                alpha: 0.1,
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              isPaid ? Icons.check_circle : Icons.pending_actions,
              color: isPaid ? Colors.green : Colors.orange,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  fee['invoiceNumber'] ?? 'Fee Invoice',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                Text(
                  'Due: ${DateFormat('MMM dd, yyyy').format(date)}',
                  style: const TextStyle(color: Colors.grey, fontSize: 12),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '\$${amount.toStringAsFixed(0)}',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                ),
              ),
              Text(
                status.toString().toUpperCase(),
                style: TextStyle(
                  color: isPaid ? Colors.green : Colors.orange,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
