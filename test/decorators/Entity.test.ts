import { Entity } from '../../lib/decorators/Entity';
import { Model } from '../../lib/core/Model';
import { ModelMetaStore } from '../../lib/decorators/ModelMetaStore';

// Test model classes
@Entity({
    timestamps: true,
    expires: 3600
})
class BasicModel extends Model {}

@Entity({
    timestamps: false,
    onSaveOverride: () => Promise.resolve(),
    onUpdateOverride: () => Promise.resolve()
})
class CustomModel extends Model {}

@Entity()
class DefaultModel extends Model {}

describe('Entity Decorator', () => {
    beforeEach(() => {
        // Clear the ModelMetaStore before each test
        (ModelMetaStore as any).store = new Map();
        (ModelMetaStore as any).entityMetas = new Map();
    });

    describe('Basic Entity Configuration', () => {
        test('should register basic model metadata', () => {
            const meta = (ModelMetaStore as any).entityMetas.get('BasicModel');
            
            expect(meta).toBeDefined();
            expect(meta.timestamps).toBe(true);
            expect(meta.expires).toBe(3600);
        });

        test('should register custom model metadata', () => {
            const meta = (ModelMetaStore as any).entityMetas.get('CustomModel');
            
            expect(meta).toBeDefined();
            expect(meta.timestamps).toBe(false);
            expect(meta.onSaveOverride).toBeDefined();
            expect(meta.onUpdateOverride).toBeDefined();
        });

        test('should register model with default options', () => {
            const meta = (ModelMetaStore as any).entityMetas.get('DefaultModel');
            
            expect(meta).toBeDefined();
            expect(meta).toEqual({});
        });
    });

    describe('Entity Options Handling', () => {
        @Entity({
            timestamps: true,
            expires: 86400,
            onSaveOverride: () => Promise.resolve(),
            onUpdateOverride: () => Promise.resolve()
        })
        class FullOptionsModel extends Model {}

        test('should handle all entity options', () => {
            const meta = (ModelMetaStore as any).entityMetas.get('FullOptionsModel');
            
            expect(meta).toBeDefined();
            expect(meta.timestamps).toBe(true);
            expect(meta.expires).toBe(86400);
            expect(meta.onSaveOverride).toBeDefined();
            expect(meta.onUpdateOverride).toBeDefined();
        });
    });

    describe('Multiple Entities', () => {
        @Entity({ timestamps: true })
        class Model1 extends Model {}

        @Entity({ expires: 3600 })
        class Model2 extends Model {}

        test('should handle multiple entity registrations', () => {
            const meta1 = (ModelMetaStore as any).entityMetas.get('Model1');
            const meta2 = (ModelMetaStore as any).entityMetas.get('Model2');
            
            expect(meta1.timestamps).toBe(true);
            expect(meta2.expires).toBe(3600);
        });
    });

    describe('Edge Cases', () => {
        test('should handle entity redefinition', () => {
            @Entity({ timestamps: true })
            class RedefinedModel extends Model {}

            const meta1 = (ModelMetaStore as any).entityMetas.get('RedefinedModel');
            expect(meta1.timestamps).toBe(true);

            @Entity({ expires: 7200 })
            class RedefinedModel2 extends Model {}

            const meta2 = (ModelMetaStore as any).entityMetas.get('RedefinedModel2');
            expect(meta2.expires).toBe(7200);
        });

        test('should handle inheritance', () => {
            @Entity({ timestamps: true })
            class ParentModel extends Model {}

            @Entity({ expires: 3600 })
            class ChildModel extends ParentModel {}

            const parentMeta = (ModelMetaStore as any).entityMetas.get('ParentModel');
            const childMeta = (ModelMetaStore as any).entityMetas.get('ChildModel');

            expect(parentMeta.timestamps).toBe(true);
            expect(childMeta.expires).toBe(3600);
        });
    });
});
