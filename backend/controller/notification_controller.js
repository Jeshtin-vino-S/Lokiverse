import Notification from "../models/notification_model.js";

export const getUnreadNotificationCount = async (req, res) => {
    try {
        const userId = req.user._id;

        const unreadCount = await Notification.countDocuments({ to: userId, read: false });
        const totalCount = await Notification.countDocuments({ to: userId });

        res.status(200).json({ count: unreadCount, unreadCount, totalCount });
    } catch (error) {
        console.log(`error in getUnreadNotificationCount: ${error}`);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getNotifications = async (req, res) => {
    try {
        const userId = req.user._id;

        const notifications = await Notification.find({ to: userId })
            .populate({
                path: "from",
                select: "username profileImg fullname"
            })
            .sort({ createdAt: -1 });

        // Mark all as read
        await Notification.updateMany({ to: userId, read: false }, { read: true });

        res.status(200).json(notifications);
    } catch (error) {
        console.log(`error in getNotifications: ${error}`);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const deleteNotifications = async (req, res) => {
    try {
        const userId = req.user._id;

        await Notification.deleteMany({ to: userId });

        res.status(200).json({ message: "All transmissions cleared successfully" });
    } catch (error) {
        console.log(`error in deleteNotifications: ${error}`);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const deleteNotificationById = async (req, res) => {
    try {
        const notificationId = req.params.id;
        const userId = req.user._id;

        const notification = await Notification.findById(notificationId);

        if (!notification) {
            return res.status(404).json({ error: "Notification not found" });
        }

        if (notification.to.toString() !== userId.toString()) {
            return res.status(403).json({ error: "You are not authorized to delete this notification" });
        }

        await Notification.findByIdAndDelete(notificationId);

        res.status(200).json({ message: "Transmission deleted successfully" });
    } catch (error) {
        console.log(`error in deleteNotificationById: ${error}`);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

