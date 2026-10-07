import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { Image } from './Image';

describe('Image', () => {
  it('renders a lazy image with alt text', () => {
    render(<Image src="/pic.png" alt="A mountain" />);
    const img = screen.getByRole('img', { name: 'A mountain' });
    expect(img.tagName).toBe('IMG');
    expect(img).toHaveAttribute('src', '/pic.png');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveClass('axon-image', 'axon-image--fit-cover');
  });

  it('can load eagerly and be given width and height', () => {
    render(<Image src="/pic.png" alt="x" loading="eager" width={200} height={100} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('loading', 'eager');
    expect(img).toHaveAttribute('width', '200');
  });

  it('reserves space with an aspect ratio', () => {
    render(<Image src="/pic.png" alt="x" aspectRatio="16 / 9" />);
    expect(screen.getByRole('img')).toHaveStyle({ aspectRatio: '16 / 9' });
  });

  it('applies fit and radius modifiers', () => {
    render(<Image src="/pic.png" alt="x" fit="contain" radius="lg" />);
    expect(screen.getByRole('img')).toHaveClass('axon-image--fit-contain', 'axon-image--radius-lg');
  });

  it('forwards the ref and merges className and style', () => {
    const ref = createRef<HTMLImageElement>();
    render(<Image ref={ref} src="/pic.png" alt="x" className="extra" style={{ margin: 2 }} />);
    expect(ref.current?.tagName).toBe('IMG');
    expect(ref.current).toHaveClass('extra');
    expect(ref.current).toHaveStyle({ margin: '2px' });
  });

  describe('when the image fails', () => {
    it('shows a neutral placeholder that keeps the alt text', () => {
      render(<Image src="/broken.png" alt="A mountain" />);
      fireEvent.error(screen.getByRole('img'));
      const placeholder = screen.getByRole('img', { name: 'A mountain' });
      expect(placeholder.tagName).toBe('SPAN');
      expect(placeholder).toHaveClass('axon-image--fallback');
      expect(document.querySelector('img')).toBeNull();
    });

    it('hides the placeholder from assistive technology for a decorative image', () => {
      const { container } = render(<Image src="/broken.png" alt="" />);
      fireEvent.error(container.querySelector('img')!);
      expect(container.querySelector('.axon-image--fallback')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('shows a custom fallback node', () => {
      render(<Image src="/broken.png" alt="Logo" fallback={<b data-testid="fb">LOGO</b>} />);
      fireEvent.error(screen.getByRole('img'));
      expect(screen.getByTestId('fb')).toBeInTheDocument();
      expect(screen.getByRole('img', { name: 'Logo' }).tagName).toBe('SPAN');
    });

    it('tries a fallback image URL first, then the placeholder', () => {
      render(<Image src="/broken.png" alt="Logo" fallback="/backup.png" />);
      fireEvent.error(screen.getByRole('img'));
      const backup = screen.getByRole('img', { name: 'Logo' });
      expect(backup.tagName).toBe('IMG');
      expect(backup).toHaveAttribute('src', '/backup.png');
      fireEvent.error(backup);
      expect(screen.getByRole('img', { name: 'Logo' }).tagName).toBe('SPAN');
    });

    it('recovers when src changes', () => {
      const { rerender } = render(<Image src="/broken.png" alt="x" />);
      fireEvent.error(screen.getByRole('img'));
      expect(screen.getByRole('img').tagName).toBe('SPAN');
      rerender(<Image src="/good.png" alt="x" />);
      expect(screen.getByRole('img')).toHaveAttribute('src', '/good.png');
    });

    it('keeps the aspect ratio on the placeholder', () => {
      render(<Image src="/broken.png" alt="x" aspectRatio="4 / 3" />);
      fireEvent.error(screen.getByRole('img'));
      expect(screen.getByRole('img')).toHaveStyle({ aspectRatio: '4 / 3' });
    });
  });

  it('shows the placeholder straight away without a src', () => {
    render(<Image alt="No source" />);
    expect(screen.getByRole('img', { name: 'No source' }).tagName).toBe('SPAN');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div>
        <Image src="/pic.png" alt="A mountain" />
        <Image src="/pic.png" alt="" />
        <Image alt="Missing" />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
