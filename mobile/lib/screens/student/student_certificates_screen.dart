import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/student_provider.dart';
import 'package:flutter_zoom_drawer/flutter_zoom_drawer.dart';

class StudentCertificatesScreen extends StatefulWidget {
  const StudentCertificatesScreen({super.key});

  @override
  State<StudentCertificatesScreen> createState() =>
      _StudentCertificatesScreenState();
}

class _StudentCertificatesScreenState extends State<StudentCertificatesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<StudentProvider>().fetchCertificates();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        leading: Builder(
          builder: (context) => IconButton(
            icon: const Icon(Icons.menu, color: Colors.white),
            onPressed: () => ZoomDrawer.of(context)?.toggle(),
          ),
        ),
        title: const Text(
          'My Digital Credentials',
          style: TextStyle(
            fontWeight: FontWeight.w900,
            fontSize: 20,
            color: Colors.white,
          ),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
      ),
      body: Consumer<StudentProvider>(
        builder: (context, provider, child) {
          if (provider.isLoading && provider.certificates.isEmpty) {
            return const Center(
              child: CircularProgressIndicator(color: Colors.indigo),
            );
          }

          if (provider.certificates.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.05),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.workspace_premium,
                      size: 64,
                      color: Colors.indigo,
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'No certificates yet',
                    style: TextStyle(
                      color: Colors.white70,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () => provider.fetchCertificates(),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: provider.certificates.length,
              itemBuilder: (context, index) {
                final cert = provider.certificates[index];
                return Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: Colors.white.withOpacity(0.1)),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: Colors.indigo.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(
                                Icons.description,
                                color: Colors.indigoAccent,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.green.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                cert['status']?.toUpperCase() ?? 'ACTIVE',
                                style: const TextStyle(
                                  color: Colors.greenAccent,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Text(
                          cert['title'] ?? 'Digital Certificate',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          cert['certificateType'] ?? 'Achievement',
                          style: TextStyle(
                            color: Colors.indigo.shade300,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1,
                          ),
                        ),
                        const SizedBox(height: 20),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.black.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            children: [
                              const Icon(
                                Icons.qr_code_2,
                                color: Colors.white30,
                                size: 20,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                cert['certificateNumber'] ?? '',
                                style: const TextStyle(
                                  color: Colors.white54,
                                  fontSize: 11,
                                  fontFamily: 'monospace',
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
