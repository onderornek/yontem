#include <cstdio>
#include <vector>
int main() {
  const int N = 100;
  std::vector<double> A, B, C;
  for (int i = 0; i < N * N; i++) { A.push_back(((i * 7) % 13) / 13.0); B.push_back(((i * 5) % 11) / 11.0); C.push_back(0.0); }
  for (int i = 0; i < N; i++)
    for (int j = 0; j < N; j++) {
      double s = 0.0;
      for (int k = 0; k < N; k++) s += A[i * N + k] * B[k * N + j];
      C[i * N + j] = s;
    }
  double iz = 0.0;
  for (int i = 0; i < N; i++) iz += C[i * N + i];
  std::printf("%.6f\n", iz);
  return 0;
}
