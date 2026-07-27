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
            icon: const Icon(Icons.menu, color: Colors.black),
            onPressed: () => ZoomDrawer.of(context)?.toggle(),
          ),
        ),
        title: const Text(
          'My Fees',
          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black),
        ),
        elevation: 0,
        backgroundColor: Colors.white,
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
        gradient: const LinearGradient(
          colors: [Color(0xFFF43F5E), Color(0xFFFB7185)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFF43F5E).withOpacity(0.3),
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
              color: Colors.white70,
              fontSize: 12,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '\$${pending.toStringAsFixed(2)}',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 36,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Text(
              'Academic Year 2025-26',
              style: TextStyle(
                color: Colors.white,
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
            color: Colors.black.withOpacity(0.02),
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
              color: (isPaid ? Colors.green : Colors.orange).withOpacity(0.1),
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
