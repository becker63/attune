package org.teavm.classlib.java.util.concurrent;

import java.util.AbstractQueue;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Iterator;

/**
 * TeaVM class-library substitution for Flix's region bookkeeping.
 * A worker runs one synchronous call at a time; no Flix threads are admitted.
 * Every operation is atomic in that execution model. This does not implement
 * JVM multithreading: TeaVM must still reject spawn and the Datalog runtime.
 */
public final class TConcurrentLinkedQueue<E> extends AbstractQueue<E> {
    private final ArrayDeque<E> values = new ArrayDeque<>();
    public boolean offer(E value) { return values.offer(value); }
    public E poll() { return values.poll(); }
    public E peek() { return values.peek(); }
    public int size() { return values.size(); }
    public Iterator<E> iterator() { return new ArrayList<>(values).iterator(); }
}
