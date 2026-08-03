import Foundation

enum PlannerItemKind: String, Codable {
    case calendar
    case reminder
}

struct PlannerTransfer: Codable, Equatable {
    var title: String
    var date: Date
    var kind: PlannerItemKind

    static let empty = PlannerTransfer(title: "", date: .now, kind: .reminder)
}

enum SharedPlannerStore {
    static let suiteName = "group.com.seiyooon4work.daylist"
    private static let transferKey = "latestPlannerTransfer"

    static var defaults: UserDefaults {
        UserDefaults(suiteName: suiteName) ?? .standard
    }

    static func save(_ transfer: PlannerTransfer) {
        guard let data = try? JSONEncoder().encode(transfer) else { return }
        defaults.set(data, forKey: transferKey)
    }

    static func load() -> PlannerTransfer? {
        guard let data = defaults.data(forKey: transferKey) else { return nil }
        return try? JSONDecoder().decode(PlannerTransfer.self, from: data)
    }
}

