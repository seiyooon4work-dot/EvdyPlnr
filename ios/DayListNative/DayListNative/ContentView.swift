import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var eventKit: EventKitManager
    @State private var title = ""
    @State private var date = Date().addingTimeInterval(60 * 30)

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    hero
                    composer
                    integrationNote
                }
                .padding(20)
            }
            .background(Color(red: 0.957, green: 0.945, blue: 0.922).ignoresSafeArea())
            .navigationTitle("하루기록")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("APPLE INTEGRATION")
                .font(.system(size: 10, weight: .medium, design: .monospaced))
                .foregroundStyle(Color(red: 0.84, green: 0.95, blue: 0.42))
            Text("오늘의 일을\n애플 앱에 남겨요")
                .font(.system(size: 30, weight: .bold, design: .rounded))
                .tracking(-1.2)
                .foregroundStyle(.white)
            Text("한 번 입력하고 캘린더 또는 미리 알림으로 바로 보낼 수 있어요.")
                .font(.system(size: 13))
                .foregroundStyle(Color.white.opacity(0.68))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(22)
        .background(Color(red: 0.145, green: 0.16, blue: 0.137), in: RoundedRectangle(cornerRadius: 24))
    }

    private var composer: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("새 항목")
                .font(.system(size: 19, weight: .bold, design: .rounded))

            TextField("예: 팀 회의, 물 마시기", text: $title)
                .textFieldStyle(.roundedBorder)

            DatePicker("시간", selection: $date, displayedComponents: [.date, .hourAndMinute])
                .font(.system(size: 14, weight: .medium))

            HStack(spacing: 10) {
                actionButton(title: "캘린더에 추가", systemImage: "calendar.badge.plus") {
                    Task { await eventKit.addEvent(title: title, date: date) }
                }
                actionButton(title: "미리 알림에 추가", systemImage: "checklist") {
                    Task { await eventKit.addReminder(title: title, date: date) }
                }
            }

            if eventKit.isWorking {
                ProgressView()
                    .frame(maxWidth: .infinity)
            }

            Text(eventKit.message)
                .font(.system(size: 12))
                .foregroundStyle(.secondary)
        }
        .padding(20)
        .background(.white.opacity(0.86), in: RoundedRectangle(cornerRadius: 20))
    }

    private var integrationNote: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("처음 한 번만 권한을 허용해주세요", systemImage: "lock.open")
                .font(.system(size: 13, weight: .semibold))
            Text("캘린더와 미리 알림은 아이폰의 권한을 통해 저장됩니다. 웹 플래너의 기록과 자동으로 합치려면 다음 단계에서 동기화 서버를 연결할 수 있어요.")
                .font(.system(size: 12))
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(16)
        .background(Color(red: 0.94, green: 0.97, blue: 0.79), in: RoundedRectangle(cornerRadius: 16))
    }

    private func actionButton(title: String, systemImage: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Label(title, systemImage: systemImage)
                .font(.system(size: 12, weight: .semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 11)
        }
        .buttonStyle(.borderedProminent)
        .tint(Color(red: 0.64, green: 0.78, blue: 0.22))
    }
}
