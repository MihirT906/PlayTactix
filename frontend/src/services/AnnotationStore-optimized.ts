import { getLogger } from "../services/logger";
import type { DrawShape, Segment } from "../plot/annotationGeometry";

const logger = getLogger("AnnotationStore");

interface Annotation {
    type: string;
    frameStart?: number;
    frameEnd?: number;
    shape: any;
}

let drawCounter = 0;
function newDrawKey(type: string): string {
    return `${type}|${Date.now().toString(36)}-${(drawCounter++).toString(36)}`;
}

let playerLineCounter = 0;
function newPlayerLineKey(): string {
    // Immutable identity: independent of the pair and frame range, which are mutable data
    return `playerLine|${Date.now().toString(36)}-${(playerLineCounter++).toString(36)}`;
}

let arrowCounter = 0;
function newArrowKey(): string {
    return `arrow|${Date.now().toString(36)}-${(arrowCounter++).toString(36)}`;
}

let teamShapeCounter = 0;
function newTeamShapeKey(): string {
    return `teamShape|${Date.now().toString(36)}-${(teamShapeCounter++).toString(36)}`;
}

// A team shape needs a triangle at least; fewer players enclose no area.
const MIN_TEAM_SHAPE_PLAYERS = 3;

function samePair(a: number[], b: number[]): boolean {
    const norm = (p: number[]) => [...p].sort((x, y) => x - y).join(',');
    return norm(a) === norm(b);
}

export default class AnnotationStore {
    private active_annotations: Map<string, Annotation> = new Map() // Contains all currently active annotations
    private annotations: Map<string, Annotation> = new Map() // Contains all annotations

    reconstruct_active_annotations(currentFrame: number) {
        // Rebuilds the active set from each annotation's own [frameStart, frameEnd) range. The ranges are the
        // single source of truth for visibility (and for the timeline bars), so nothing else may track it.
        this.active_annotations.clear()
        for (const [key, annotation] of this.annotations.entries()) {
            const start = annotation.frameStart ?? 0
            if (start > currentFrame) continue;
            if (annotation.frameEnd !== undefined && annotation.frameEnd <= currentFrame) continue;
            this.active_annotations.set(key, annotation)
        }
    }

    private discardAnnotation(key: string) {
        // Annotation was created and deleted on the same frame - never store it
        this.annotations.delete(key);
        this.active_annotations.delete(key);
    }

    update_active_annotation(currentFrame: number) {
        // Keeps active annotations current
        this.reconstruct_active_annotations(currentFrame)
    }

    addPlayerLineAnnotation(player1: number, player2: number, currentFrame: number){
        // Create a player line annotation and add it to the store
        const annotation: Annotation = {
            type: 'playerLine',
            shape: {
                players: [player1, player2]
            }
        };
        logger.info("Add player line annotation called for players:", player1, player2, "at frame:", currentFrame);
        // const uniqueKey = createShapeKey(annotation.shape, currentFrame);
        // if (this.active_annotations.has(uniqueKey)) return;
        // loop through active annotations to check if an identical annotation already exists (to prevent duplicates from relayout events)
        for (const existingAnnotation of this.active_annotations.values()) {
            if (existingAnnotation.type !== 'playerLine') continue;
            if (samePair(existingAnnotation.shape.players, annotation.shape.players)) {
                return;
            }
        }
        const uniqueKey = newPlayerLineKey();
        annotation.frameStart = currentFrame;
        annotation.frameEnd = undefined;
        this.annotations.set(uniqueKey, annotation);
        this.update_active_annotation(currentFrame)
    }

    addDrawAnnotation(shape: DrawShape, currentFrame: number) {
        // A rectangle or line drawn on the pitch. Shapes saved before they were drawn by PitchKit are Plotly
        // shape objects, which carry the same type and corners, so both load alike.
        logger.info("Added draw annotation at frame:", currentFrame);
        this.annotations.set(newDrawKey(shape.type), {
            type: 'draw',
            frameStart: currentFrame,
            frameEnd: undefined,
            shape: { ...shape },
        });
        this.update_active_annotation(currentFrame)
    }

    updateAnnotationGeometry(key: string, geometry: Segment) {
        // Moves or reshapes a drawn shape or an arrow over its whole range, keeping anything else it carries.
        const annotation = this.annotations.get(key);
        if (!annotation || (annotation.type !== 'draw' && annotation.type !== 'arrow')) return;
        annotation.shape = { ...annotation.shape, ...geometry };
    }

    addArrowAnnotation(x0: number, y0: number, x1: number, y1: number, currentFrame: number) {
        logger.info("Added arrow annotation at frame:", currentFrame);
        this.annotations.set(newArrowKey(), {
            type: 'arrow',
            frameStart: currentFrame,
            frameEnd: undefined,
            shape: { x0, y0, x1, y1 },
        });
        this.update_active_annotation(currentFrame)
    }

    setTeamShapePlayers(key: string | null, players: number[], currentFrame: number): string | null {
        // Creates the team shape `key` or changes the players it is drawn around, and returns its key.
        // With too few players left to enclose an area the shape is dropped and null returned.
        const existing = key ? this.annotations.get(key) : undefined;
        if (players.length < MIN_TEAM_SHAPE_PLAYERS) {
            if (key) this.removeAnnotation(key);
            return null;
        }
        if (key && existing) {
            existing.shape = { players: [...players] };
            return key;
        }
        logger.info("Added team shape annotation at frame:", currentFrame);
        const uniqueKey = newTeamShapeKey();
        this.annotations.set(uniqueKey, {
            type: 'teamShape',
            frameStart: currentFrame,
            frameEnd: undefined,
            shape: { players: [...players] },
        });
        this.update_active_annotation(currentFrame)
        return uniqueKey;
    }

    getTeamShapeAnnotations(_currentFrame: number): Array<{ key: string; players: number[] }> {
        return Array.from(this.active_annotations.entries())
            .filter(([, annotation]) => annotation.type === 'teamShape')
            .map(([key, annotation]) => ({ key, players: annotation.shape.players }));
    }

    getArrowAnnotations(_currentFrame: number): Array<Segment & { key: string }> {
        return Array.from(this.active_annotations.entries())
            .filter(([, annotation]) => annotation.type === 'arrow')
            .map(([key, annotation]) => ({ key, x0: annotation.shape.x0, y0: annotation.shape.y0, x1: annotation.shape.x1, y1: annotation.shape.y1 }));
    }

    getPlayerLineAnnotations(_currentFrame: number): Array<{ key: string; players: [number, number] }> {
        return Array.from(this.active_annotations.entries())
            .filter(([, annotation]) => annotation.type === 'playerLine')
            .map(([key, annotation]) => ({ key, players: annotation.shape.players }));
    }

    getDrawAnnotations(_currentFrame: number): Array<{ key: string; shape: DrawShape }> {
        return Array.from(this.active_annotations.entries())
            .filter(([, annotation]) => annotation.type === 'draw' && (annotation.shape.type === 'rect' || annotation.shape.type === 'line'))
            .map(([key, { shape }]) => ({ key, shape: { type: shape.type, x0: shape.x0, y0: shape.y0, x1: shape.x1, y1: shape.y1 } }));
    }

    getAllAnnotations(): Array<{ key: string; type: string; frameStart: number; frameEnd: number | null; shape: any }> {
        // Returns every annotation ever created (not just the ones active at a given frame), for timeline display
        return Array.from(this.annotations.entries()).map(([key, annotation]) => ({
            key,
            type: annotation.type,
            frameStart: annotation.frameStart ?? 0,
            frameEnd: annotation.frameEnd ?? null,
            shape: annotation.shape,
        }));
    }

    updateAnnotationRange(key: string, frameStart: number, frameEnd: number | null, currentFrame: number) {
        // Moves/resizes an annotation (used by the timeline's draggable bars) and
        // rebuilds active_annotations for the current frame.
        const annotation = this.annotations.get(key);
        if (!annotation) return;

        annotation.frameStart = frameStart;
        annotation.frameEnd = frameEnd ?? undefined;

        logger.info("Updated annotation range", key, frameStart, frameEnd);
        this.reconstruct_active_annotations(currentFrame);
    }

    endAnnotation(key: string, currentFrame: number) {
        // Erases an annotation from this frame on, so it still shows before it; one made on this very frame
        // is never stored.
        const annotation = this.annotations.get(key);
        if (!annotation) return;
        logger.info("Ended annotation", key, "at frame:", currentFrame);
        if ((annotation.frameStart ?? 0) >= currentFrame) this.discardAnnotation(key);
        else annotation.frameEnd = currentFrame;
        this.reconstruct_active_annotations(currentFrame);
    }

    removeAnnotation(key: string) {
        // Permanently drops a single annotation (used by the timeline's right-click delete).
        if (!this.annotations.has(key)) return;
        logger.info("Removed annotation", key);
        this.annotations.delete(key);
        this.active_annotations.delete(key);
    }

    clear() {
        // Discards every annotation, e.g. when the clip's segment changes and old
        // clip-relative frame numbers no longer refer to the same footage.
        logger.info("Clip annotations cleared");
        this.active_annotations.clear();
        this.annotations.clear();
    }

    load(saved: Array<{ key: string; type: string; frameStart: number; frameEnd: number | null; shape: any }>, currentFrame: number = 0) {
        // Replaces the store's contents with previously saved annotations (see getAllAnnotations),
        // then rebuilding which of them are active at currentFrame.
        this.clear();
        for (const item of saved) {
            const annotation: Annotation = {
                type: item.type,
                frameStart: item.frameStart,
                frameEnd: item.frameEnd ?? undefined,
                shape: item.shape,
            };
            this.annotations.set(item.key, annotation);
        }
        logger.info("Loaded annotations", saved.length);
        this.reconstruct_active_annotations(currentFrame);
    }

    describeAnnotationStore(){
        console.log('Active Annotations:', this.active_annotations)
        console.log('All Annotations:', this.annotations)
    }

}