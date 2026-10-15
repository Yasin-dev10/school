import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../services/api_service.dart';

class ParentFeesScreen extends StatefulWidget {
  const ParentFeesScreen({super.key});

  @override
  State<ParentFeesScreen> createState() => _ParentFeesScreenState();
}

class _ParentFeesScreenState extends State<ParentFeesScreen> {
  final ApiService _api = ApiService();
  List<dynamic> _invoices = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final response = await _api.get('/fees/invoices');
      final body = jsonDecode(response.body) as Map<String, dynamic>;
      if (response.statusCode >= 400 || body['success'] != true) {
        throw Exception(body['message'] ?? 'Could not load fee records.');
      }
      if (!mounted) return;
      setState(() => _invoices = (body['data'] as List<dynamic>?) ?? []);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final money = NumberFormat('#,##0.00');
    return Scaffold(
      appBar: AppBar(title: const Text('Carruurta: lacagaha')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!, textAlign: TextAlign.center))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _invoices.isEmpty
                      ? ListView(children: const [SizedBox(height: 180), Center(child: Text('Biilal lama helin.'))])
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _invoices.length,
                          itemBuilder: (context, index) {
                            final invoice = _invoices[index] as Map<String, dynamic>;
                            final student = invoice['student'] as Map<String, dynamic>? ?? {};
                            final total = (invoice['totalAmount'] as num?)?.toDouble() ?? 0;
                            final paid = (invoice['paidAmount'] as num?)?.toDouble() ?? 0;
                            final due = invoice['dueDate'] == null ? null : DateTime.tryParse(invoice['dueDate'].toString());
                            return Card(
                              margin: const EdgeInsets.only(bottom: 12),
                              child: ListTile(
                                title: Text('${student['firstName'] ?? ''} ${student['lastName'] ?? ''}'.trim(), style: const TextStyle(fontWeight: FontWeight.bold)),
                                subtitle: Text('${invoice['invoiceNumber'] ?? 'Biil'}${due == null ? '' : ' • Waqtiga: ${DateFormat.yMMMd().format(due)}'}\nLa bixiyey: ${money.format(paid)}  •  Hadhay: ${money.format((total - paid).clamp(0, total))}'),
                                isThreeLine: true,
                                trailing: Text(money.format(total), style: const TextStyle(fontWeight: FontWeight.bold)),
                              ),
                            );
                          },
                        ),
                ),
    );
  }
}
