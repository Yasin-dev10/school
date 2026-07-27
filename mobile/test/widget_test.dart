import 'package:flutter_test/flutter_test.dart';
import 'package:school_registry/config/app_config.dart';

void main() {
  test('production API matches live web backend', () {
    expect(AppConfig.productionApiBase, 'https://school-ta8j.onrender.com/api');
    expect(AppConfig.apiBaseUrl, AppConfig.productionApiBase);
    expect(AppConfig.socketUrl, 'https://school-ta8j.onrender.com');
  });
}
