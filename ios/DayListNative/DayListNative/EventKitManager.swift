import EventKit
import Foundation
import WidgetKit

@MainActor
final class EventKitManager: ObservableObject {
    @Published var message = "캘린더나 미리 알림에 바로 남길 수 있어요."
    @Published var isWorking = false

    private let store = EKEventStore()

    func addEvent(title: String, date: Date) async {
        guard !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            message = "내용을 먼저 적어주세요."
            return
        }

        isWorking = true
        defer { isWorking = false }

        do {
            guard try await requestCalendarAccess() else {
                message = "캘린더 권한이 허용되지 않았어요."
                return
            }

            let event = EKEvent(eventStore: store)
            event.title = title.trimmingCharacters(in: .whitespacesAndNewlines)
            event.startDate = date
            event.endDate = date.addingTimeInterval(60 * 30)
            event.calendar = store.defaultCalendarForNewEvents
            try store.save(event, span: .thisEvent)
            saveTransfer(title: event.title, date: date, kind: .calendar)
            message = "캘린더에 추가했어요."
        } catch {
            message = "캘린더에 추가하지 못했어요."
        }
    }

    func addReminder(title: String, date: Date) async {
        guard !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            message = "내용을 먼저 적어주세요."
            return
        }

        isWorking = true
        defer { isWorking = false }

        do {
            guard try await requestReminderAccess() else {
                message = "미리 알림 권한이 허용되지 않았어요."
                return
            }

            let reminder = EKReminder(eventStore: store)
            reminder.title = title.trimmingCharacters(in: .whitespacesAndNewlines)
            reminder.calendar = store.defaultCalendarForNewReminders()
            reminder.dueDateComponents = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: date)
            try store.save(reminder, commit: true)
            saveTransfer(title: reminder.title, date: date, kind: .reminder)
            message = "미리 알림에 추가했어요."
        } catch {
            message = "미리 알림에 추가하지 못했어요."
        }
    }

    private func saveTransfer(title: String, date: Date, kind: PlannerItemKind) {
        SharedPlannerStore.save(PlannerTransfer(title: title, date: date, kind: kind))
        WidgetCenter.shared.reloadAllTimelines()
    }

    private func requestCalendarAccess() async throws -> Bool {
        try await withCheckedThrowingContinuation { continuation in
            store.requestFullAccessToEvents { granted, error in
                if let error { continuation.resume(throwing: error) }
                else { continuation.resume(returning: granted) }
            }
        }
    }

    private func requestReminderAccess() async throws -> Bool {
        try await withCheckedThrowingContinuation { continuation in
            store.requestFullAccessToReminders { granted, error in
                if let error { continuation.resume(throwing: error) }
                else { continuation.resume(returning: granted) }
            }
        }
    }
}
