# Script to generate dedicated 512x512 high-resolution, bicubic-resampled headshot avatars
# from the 1904x2544 master portraits in public/reporters/

Add-Type -AssemblyName System.Drawing

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$reportersDir = Join-Path (Split-Path -Parent $scriptDir) "public\reporters"

$avatars = @(
    @{
        Source = "marcus-vance.png"
        Output = "marcus-vance-avatar.png"
        # Marcus Vance: Head center approx (952, 950). Bounding box centered on face and upper collar
        X = 350
        Y = 350
        Size = 1250
    },
    @{
        Source = "buck-callahan.png"
        Output = "buck-callahan-avatar.png"
        # Buck Callahan: Head center approx (952, 900). Bounding box centered on yelling face and top mic
        X = 300
        Y = 300
        Size = 1300
    },
    @{
        Source = "chloe-carmichael.png"
        Output = "chloe-carmichael-avatar.png"
        # Chloe Carmichael: Head center approx (850, 800). Bounding box centered on face and hair
        X = 380
        Y = 220
        Size = 1200
    },
    @{
        Source = "marty-sullivan.png"
        Output = "marty-sullivan-avatar.png"
        # Marty Sullivan: Head center approx (1000, 750). Bounding box centered on face and collar
        X = 480
        Y = 180
        Size = 1200
    }
)

Write-Output "Starting avatar generation in: $reportersDir"

foreach ($item in $avatars) {
    $srcPath = Join-Path $reportersDir $item.Source
    if (-not (Test-Path $srcPath)) {
        Write-Error "Source file not found: $srcPath"
        continue
    }

    $srcImg = [System.Drawing.Image]::FromFile($srcPath)
    $targetSize = 512

    $destBmp = New-Object System.Drawing.Bitmap($targetSize, $targetSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($destBmp)
    
    # Ultra high quality downsampling
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    $srcRect = New-Object System.Drawing.Rectangle($item.X, $item.Y, $item.Size, $item.Size)
    $destRect = New-Object System.Drawing.Rectangle(0, 0, $targetSize, $targetSize)

    $g.DrawImage($srcImg, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

    $outPath = Join-Path $reportersDir $item.Output
    
    # Save as PNG
    $destBmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $g.Dispose()
    $destBmp.Dispose()
    $srcImg.Dispose()

    $fileInfo = Get-Item $outPath
    Write-Output "Generated $($item.Output) - $([math]::Round($fileInfo.Length / 1KB, 1)) KB"
}

Write-Output "Avatar generation complete!"

