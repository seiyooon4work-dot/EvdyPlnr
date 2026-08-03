import SwiftUI
import WidgetKit

struct DayListWidgetEntry: TimelineEntry {
    let date: Date
    let transfer: PlannerTransfer?
}

struct DayListWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> DayListWidgetEntry {
        DayListWidgetEntry(date: .now, transfer: PlannerTransfer(title: "오늘의 기록", date: .now, kind: .reminder))
    }

    func getSnapshot(in context: Context, completion: @escaping (DayListWidgetEntry) -> Void) {
        completion(DayListWidgetEntry(date: .now, transfer: SharedPlannerStore.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<DayListWidgetEntry>) -> Void) {
        let entry = DayListWidgetEntry(date: .now, transfer: SharedPlannerStore.load())
        let refresh = Calendar.current.date(byAdding: .minute, value: 30, to: .now) ?? .now.addingTimeInterval(1800)
        completion(Timeline(entries: [entry], policy: .after(refresh)))
    }
}

struct DayListWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: DayListWidgetEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("하루기록")
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                Spacer()
                Image(systemName: entry.transfer?.kind == .calendar ? "calendar" : "checklist")
                    .font(.system(size: 13, weight: .semibold))
            }
            Text(entry.transfer?.title ?? "오늘의 일을 남겨보세요")
                .font(.system(size: family == .systemSmall ? 17 : 20, weight: .bold, design: .rounded))
                .lineLimit(3)
            Spacer(minLength: 0)
            Text(entry.transfer.map { $0.kind == .calendar ? "캘린더에 추가됨" : "미리 알림에 추가됨" } ?? "애플 앱 연동 준비")
                .font(.system(size: 10, weight: .medium, design: .monospaced))
                .foregroundStyle(.secondary)
        }
        .containerBackground(for: .widget) {
            Color(red: 0.94, green: 0.97, blue: 0.79)
        }
    }
}

struct DayListWidget: Widget {
    let kind = "DayListWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DayListWidgetProvider()) { entry in
            DayListWidgetView(entry: entry)
        }
        .configurationDisplayName("하루기록")
        .description("최근에 애플 캘린더 또는 미리 알림으로 보낸 항목을 보여줘요.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct DayListWidgetBundle: WidgetBundle {
    var body: some Widget {
        DayListWidget()
    }
}

