import { io, type Socket } from "socket.io-client"
import { updateSightingStatus, incrementNotificationCount } from "../../../store/slices/sightingReportsSlice"
import { updateReportStatus } from "../../../store/slices/myReportsSlice"
import { incrementNotificationCount as incrementPoliceDashboardNotification } from "../../../store/slices/policeDashboardSlice"
import { incrementNotificationCount as incrementPoliceSightingsNotification } from "../../../store/slices/policeSightingsSlice"
import { addNotification } from "../../../store/slices/notificationsSlice"
import type { AppDispatch } from "../../../store"
import { addNewSightingReport, checkAndAddNewSightingReport } from "../../../store/slices/sightingReportsSlice";
import type { SightingReport } from "../../../types"

let socket: Socket | null = null

export const initializeSocket = (
  userId: string,
  dispatch: AppDispatch,
  selectedSightingId: string | null = null,
  page = "details",
) => {
  if (!socket && userId) {
    socket = io()

    socket.on("connect", () => {
      console.log(`Socket connected in ${page}`)
      socket.emit("authenticate", userId)
      console.log("Authenticated with socket server: " + userId)
    })

    socket.on("notification", (data) => {
      if (page === "details" && data.sightingReportId) {
        const sightingId = data.sightingReportId

        if (data.newStatus) {
          dispatch(
            updateSightingStatus({
              sightingId,
              status:
                data.newStatus === "SOLVED"
                  ? "SOLVED"
                  : data.newStatus === "SENT_TEAM"
                    ? "SENT_TEAM"
                    : data.newStatus === "NOTIFIED_FAMILY"
                      ? "NOTIFIED_FAMILY"
                      : "Pending",
            }),
          )
        }

        if (selectedSightingId !== sightingId) {
          dispatch(incrementNotificationCount(sightingId))
        }

        if (data.notification) {
          dispatch(addNotification(data.notification))
        }

        // Use the checkAndAddNewSightingReport thunk which handles existence check internally
        if (data.notification && data.notification.sightingReport) {
          dispatch(checkAndAddNewSightingReport(data.notification.sightingReport))
        }
      }

      if (page === "myReports" && data.missingPersonId) {
        const missingId = data.missingPersonId
        console.log("Notification received for missing person:", missingId)

        dispatch(
          updateReportStatus({
            missingPersonId: missingId,
            status:
              data.newStatus === "SOLVED"
                ? "Found"
                : data.newStatus === "SENT_TEAM"
                  ? "Investigating"
                  : data.newStatus === "NOTIFIED_FAMILY"
                    ? "Awaiting Verification"
                    : "Rejected",
          }),
        )
      }

      if (page === "policeDashboard" && data.missingPersonId) {
        const missingId = data.missingPersonId
        console.log("Notification received for missing person in police dashboard:", missingId)

        dispatch(incrementPoliceDashboardNotification(missingId))
      }

      if (page === "policeSightings" && data.sightingReportId) {
        const sightingId = data.sightingReportId
        console.log("Notification received for sighting report in police sightings:", sightingId)

        dispatch(incrementPoliceSightingsNotification(sightingId))
      }
    })

    return socket
  }

  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}