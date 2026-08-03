import SwiftUI

@main
struct DayListNativeApp: App {
    @StateObject private var eventKit = EventKitManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(eventKit)
        }
    }
}

