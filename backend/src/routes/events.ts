import express from 'express';
import Event from '../models/Event';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/roles';

const router = express.Router();

// Get all events
router.get('/', async (req, res) => {
  try {
    const { active } = req.query;
    const query: any = {};
    
    if (active === 'true') {
      query.isActive = true;
      // Optional: Filter out past events
      // query.endDate = { $gte: new Date() }; 
    }
    
    // Sort by start date (soonest first)
    const events = await Event.find(query).sort({ startDate: 1 });
    res.json({ events });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get single event
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json({ event });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Create event (Admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const event = new Event(req.body);
    await event.save();
    res.status(201).json({ message: 'Event created', event });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Update event (Admin only)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json({ message: 'Event updated', event });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Delete event (Admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json({ message: 'Event deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;
