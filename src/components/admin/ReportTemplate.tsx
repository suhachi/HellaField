import React, { forwardRef } from 'react';
import type { Job, Section, Photo } from '../../lib/db';

type Props = {
    job: Job;
    sections: Section[];
    photosBySection: Record<string, Photo[]>;
};

type RenderItem = 
    | { type: 'header' }
    | { type: 'section-title'; sectionTitle: string; sectionId: string }
    | { type: 'photo-row'; before?: Photo; after?: Photo; idx: number }
    | { type: 'footer' };

const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;
const PADDING = 40;
const INNER_HEIGHT = PAGE_HEIGHT - (PADDING * 2);

const HEIGHTS = {
    'header': 120,
    'section-title': 60,
    'photo-row': 285,
    'footer': 70
};

const ReportTemplate = forwardRef<HTMLDivElement, Props>(({ job, sections, photosBySection }, ref) => {
    const items: RenderItem[] = [{ type: 'header' }];

    sections.forEach(section => {
        items.push({ type: 'section-title', sectionTitle: section.title, sectionId: section.id });
        const photos = photosBySection[section.id] || [];
        const beforePhotos = photos.filter(p => p.type === 'BEFORE');
        const afterPhotos = photos.filter(p => p.type === 'AFTER');
        const count = Math.max(beforePhotos.length, afterPhotos.length);

        if (count === 0) {
            items.pop(); // Remove the title if no photos
        } else {
            for (let i = 0; i < count; i++) {
                items.push({ type: 'photo-row', before: beforePhotos[i], after: afterPhotos[i], idx: i });
            }
        }
    });

    items.push({ type: 'footer' });

    const pages: RenderItem[][] = [];
    let currentPage: RenderItem[] = [];
    let currentHeight = 0;

    items.forEach((item, index) => {
        const h = HEIGHTS[item.type];
        let needsNewPage = currentHeight + h > INNER_HEIGHT;

        if (item.type === 'section-title') {
            const nextItem = items[index + 1];
            if (nextItem && nextItem.type === 'photo-row') {
                if (currentHeight + h + HEIGHTS['photo-row'] > INNER_HEIGHT) {
                    needsNewPage = true;
                }
            }
        }

        if (needsNewPage && currentPage.length > 0) {
            pages.push(currentPage);
            currentPage = [item];
            currentHeight = h;
        } else {
            currentPage.push(item);
            currentHeight += h;
        }
    });

    if (currentPage.length > 0) {
        pages.push(currentPage);
    }

    return (
        <div ref={ref} style={{ position: 'absolute', left: '-9999px', top: 0, display: 'flex', flexDirection: 'column', gap: '20px', background: '#e5e7eb', padding: '20px' }}>
            {pages.map((pageItems, pageIndex) => (
                <div key={pageIndex} className="pdf-page" style={{
                    width: `${PAGE_WIDTH}px`,
                    height: `${PAGE_HEIGHT}px`,
                    padding: `${PADDING}px`,
                    background: '#fff',
                    color: '#000',
                    boxSizing: 'border-box',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {pageItems.map((item, i) => {
                        if (item.type === 'header') {
                            return (
                                <div key={i} style={{ borderBottom: '2px solid #333', paddingBottom: '20px', marginBottom: '30px' }}>
                                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 10px 0' }}>현장 작업 보고서</h1>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#555' }}>
                                        <div>
                                            <strong>현장명:</strong> {job.siteTitle}
                                        </div>
                                        <div>
                                            <strong>작업일:</strong> {typeof job.date === 'string' ? job.date : (job.date as any)?.toDate?.().toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        if (item.type === 'section-title') {
                            return (
                                <h2 key={i} style={{
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    borderLeft: '4px solid #3b82f6',
                                    paddingLeft: '10px',
                                    marginBottom: '15px',
                                    marginTop: '0px',
                                    background: '#f0f9ff',
                                    padding: '8px 12px'
                                }}>
                                    {item.sectionTitle}
                                </h2>
                            );
                        }

                        if (item.type === 'photo-row') {
                            return (
                                <div key={i} style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                                    {/* BEFORE */}
                                    <div style={{ flex: 1, border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{
                                            background: '#f97316',
                                            color: '#fff',
                                            fontSize: '11px',
                                            fontWeight: 'bold',
                                            padding: '4px 8px',
                                            textAlign: 'center'
                                        }}>
                                            {item.before?.title || `BEFORE ${item.idx + 1}`}
                                        </div>
                                        <div style={{ width: '100%', height: '240px', background: '#eee' }}>
                                            {item.before ? (
                                                <img
                                                    src={item.before.downloadUrl}
                                                    alt="Before"
                                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                    crossOrigin="anonymous"
                                                />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '12px' }}>
                                                    (사진 없음)
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* AFTER */}
                                    <div style={{ flex: 1, border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{
                                            background: '#3b82f6',
                                            color: '#fff',
                                            fontSize: '11px',
                                            fontWeight: 'bold',
                                            padding: '4px 8px',
                                            textAlign: 'center'
                                        }}>
                                            {item.after?.title || `AFTER ${item.idx + 1}`}
                                        </div>
                                        <div style={{ width: '100%', height: '240px', background: '#eee' }}>
                                            {item.after ? (
                                                <img
                                                    src={item.after.downloadUrl}
                                                    alt="After"
                                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                    crossOrigin="anonymous"
                                                />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '12px' }}>
                                                    (사진 없음)
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        if (item.type === 'footer') {
                            return (
                                <div key={i} style={{ 
                                    position: 'absolute',
                                    bottom: `${PADDING}px`,
                                    left: `${PADDING}px`,
                                    right: `${PADDING}px`,
                                    borderTop: '1px solid #ddd', 
                                    paddingTop: '20px', 
                                    textAlign: 'center', 
                                    fontSize: '12px', 
                                    color: '#888' 
                                }}>
                                    HellaCompany Field Log System - Page {pageIndex + 1} of {pages.length}
                                </div>
                            );
                        }

                        return null;
                    })}
                </div>
            ))}
        </div>
    );
});

export default ReportTemplate;
